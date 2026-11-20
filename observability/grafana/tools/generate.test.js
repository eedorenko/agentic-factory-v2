import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateAll, buildDashboard, DEFINITIONS, DASHBOARD_DIR } from './generate.mjs';
import { allMetricNames, ALIAS_NAMES, LABELS, VARIABLE_NAMES, TEXTBOX_VARIABLES, METRICS } from '../definitions/common.mjs';

const dashboards = DEFINITIONS.map((def) => ({ def, json: buildDashboard(def) }));

function flattenPanels(dashboard) {
  const out = [];
  for (const p of dashboard.panels) {
    if (p.type === 'row') {
      for (const c of p.panels) out.push({ panel: c, row: p.title });
    } else {
      out.push({ panel: p, row: null });
    }
  }
  return out;
}

const queriesOf = (panel) => panel.targets.map((t) => t.expr);

test('committed dashboard JSON is fresh', () => {
  const files = readdirSync(DASHBOARD_DIR).filter((f) => f.endsWith('.json')).sort();
  const expected = generateAll();
  assert.deepEqual(files, expected.map((e) => e.file).sort());
  for (const { file, content } of expected) {
    assert.equal(readFileSync(join(DASHBOARD_DIR, file), 'utf8'), content, `${file} is stale; run tools/generate.mjs`);
  }
});

test('generator output is deterministic', () => {
  assert.deepEqual(generateAll(), generateAll());
});

test('four dashboards with unique uid and title', () => {
  assert.equal(dashboards.length, 4);
  assert.equal(new Set(dashboards.map((d) => d.json.uid)).size, 4);
  assert.equal(new Set(dashboards.map((d) => d.json.title)).size, 4);
});

test('essential panels: at most 4 summary stats and 2 main views per dashboard', () => {
  for (const { def } of dashboards) {
    assert.ok(def.summary.length <= 4, `${def.uid} summary`);
    assert.ok(def.main.length <= 2, `${def.uid} main`);
  }
});

for (const { def, json } of dashboards) {
  const panels = flattenPanels(json);

  test(`${def.uid}: unique panel ids and no overlapping gridPos`, () => {
    const ids = json.panels.flatMap((p) => [p.id, ...(p.panels ?? []).map((c) => c.id)]);
    assert.equal(new Set(ids).size, ids.length);
    // Top-level (visible) panels must not overlap; collapsed children are laid out under their row.
    const visible = json.panels;
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i].gridPos;
        const b = visible[j].gridPos;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.ok(!overlap, `${visible[i].title} overlaps ${visible[j].title}`);
      }
    }
    for (const { panel } of panels) assert.ok(panel.gridPos.x + panel.gridPos.w <= 24, panel.title);
  });

  test(`${def.uid}: every panel has description, unit, datasource variable and noValue`, () => {
    for (const { panel } of panels) {
      assert.match(panel.description, /^Question: .+/, panel.title);
      assert.match(panel.description, /Tier [AB]/, panel.title);
      assert.ok(panel.fieldConfig.defaults.unit, `${panel.title} unit`);
      assert.equal(panel.fieldConfig.defaults.noValue, 'No data');
      assert.equal(panel.datasource.uid, '${ds}');
      for (const t of panel.targets) assert.equal(t.datasource.uid, '${ds}');
    }
  });

  test(`${def.uid}: every $variable used in queries is defined`, () => {
    const defined = new Set(json.templating.list.map((v) => v.name));
    const builtin = new Set(['__range', '__rate_interval', '__interval', '__field', '__data', 'ds']);
    for (const { panel } of panels) {
      for (const expr of queriesOf(panel)) {
        for (const m of expr.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g)) {
          assert.ok(defined.has(m[1]) || builtin.has(m[1]), `${panel.title}: undefined variable $${m[1]}`);
        }
      }
    }
    for (const v of json.templating.list) {
      if (v.type !== 'query') continue;
      for (const m of v.definition.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)/g)) {
        assert.ok(defined.has(m[1]), `variable ${v.name} uses undefined $${m[1]}`);
      }
    }
    for (const name of def.variables) {
      assert.ok(VARIABLE_NAMES.includes(name) || name in TEXTBOX_VARIABLES, `unknown variable ${name}`);
    }
  });

  test(`${def.uid}: metrics come from the name map; no alias names; tier B only in tier B row`, () => {
    const known = allMetricNames();
    for (const { panel, row } of panels) {
      for (const expr of queriesOf(panel)) {
        const names = expr.match(/\b(?:gh_aw|gen_ai)_[a-z0-9_]+\b/g) ?? [];
        const metrics = names.filter((n) => !Object.values(LABELS).includes(n) && !n.endsWith('_name') && !n.endsWith('_id') && !n.endsWith('_type') && !n.endsWith('_status') && !n.endsWith('_model'));
        for (const n of metrics) {
          assert.ok(known.has(n), `${panel.title}: unknown metric ${n}`);
          assert.ok(!ALIAS_NAMES.some((a) => n.startsWith(a)), `${panel.title}: alias ${n}`);
          if (known.get(n).tier === 'B') assert.equal(row, 'Tier B: not emitted yet', `${panel.title}: tier B metric outside tier B row`);
        }
      }
      if (row === 'Tier B: not emitted yet') assert.equal(panel.description.includes('Tier B'), true);
    }
  });

  test(`${def.uid}: PromQL sanity`, () => {
    for (const { panel } of panels) {
      for (const expr of queriesOf(panel)) {
        const stripped = expr.replace(/"[^"]*"/g, '""');
        for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
          assert.equal(stripped.split(open).length, stripped.split(close).length, `${panel.title}: unbalanced ${open}${close} in ${expr}`);
        }
        for (const m of expr.matchAll(/histogram_quantile\([^,]+,\s*(.{0,40})/g)) {
          assert.match(m[1], /^sum by \(le/, `${panel.title}: histogram_quantile must wrap sum by (le)`);
        }
        const knownLabels = new Set([...Object.values(LABELS), 'kind']);
        for (const m of expr.matchAll(/\bby \(([^)]*)\)/g)) {
          for (const l of m[1].split(',').map((s) => s.trim())) assert.ok(knownLabels.has(l), `${panel.title}: unknown label ${l}`);
        }
        assert.ok(!/\bsuccess\b/.test(expr), `${panel.title}: tool status is "ok"/"error", not "success"`);
        // `increase(...)` / `rate(...)` need a range selector.
        for (const m of expr.matchAll(/\b(?:increase|rate)\(([^()]*(?:\{[^}]*\})?[^()]*)\)/g)) {
          assert.match(m[1], /\[[^\]]+\]/, `${panel.title}: missing range in ${m[0]}`);
        }
      }
    }
  });

  test(`${def.uid}: stat and table panels never map null to zero`, () => {
    for (const { panel } of panels) {
      if (['stat', 'table', 'bargauge', 'piechart'].includes(panel.type)) {
        assert.ok(!('nullValueMode' in panel.options) && !('nullValueMode' in panel.fieldConfig.defaults));
      }
    }
  });
}

test('tool-call failure uses status "error"', () => {
  const agent = dashboards.find((d) => d.def.uid === 'gh-aw-agent-performance').json;
  const exprs = flattenPanels(agent).flatMap(({ panel }) => queriesOf(panel));
  assert.ok(exprs.some((e) => e.includes('gh_aw_tool_status="error"')));
});

test('input counter is never used as non-cache input without subtracting cache', () => {
  const agent = dashboards.find((d) => d.def.uid === 'gh-aw-agent-performance').json;
  const panel = flattenPanels(agent).find(({ panel: p }) => p.title === 'Tokens by type').panel;
  assert.match(panel.targets[0].expr, /clamp_min\(.*cache_read.*cache_write/);
});

test('workflow-level panels link to GitHub Actions via $gh_repo', () => {
  for (const { json } of dashboards) {
    assert.ok(json.links.some((l) => l.url === 'https://github.com/${gh_repo}/actions'));
  }
  const ops = flattenPanels(dashboards[0].json).find(({ panel }) => panel.title.startsWith('Failure rate by workflow')).panel;
  assert.match(ops.fieldConfig.defaults.links[0].url, /actions\?query=workflow:/);
});

test('metrics map covers every metric declared by definitions', () => {
  assert.ok(Object.values(METRICS).every((m) => ['A', 'B'].includes(m.tier)));
  assert.equal(METRICS.toolCalls.base, 'gh_aw_tool_calls_total');
});
