// Builds importable Grafana dashboard JSON (schema 39) from the definitions in ./definitions.
//   node generate.mjs           write dashboards/*.json
//   node generate.mjs --check   fail if committed JSON differs from generator output
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIABLES, TEXTBOX_VARIABLES, VARIABLE_NAMES, ACTIONS_LINK } from '../definitions/common.mjs';
import operations from '../definitions/operations-overview.mjs';
import agent from '../definitions/agent-performance.mjs';
import cost from '../definitions/cost-efficiency.mjs';
import reliability from '../definitions/reliability.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const DASHBOARD_DIR = join(here, '..', 'dashboards');
export const DEFINITIONS = [operations, agent, cost, reliability];

const DS = { type: 'prometheus', uid: '${ds}' };
const GRID_WIDTH = 24;

export function panelDescription(panel) {
  const tier = panel.tier === 'B' ? 'Tier B: not emitted by gh-aw yet' : 'Tier A: emitted by gh-aw';
  const lines = [`Question: ${panel.question}`, `Metrics: ${tier}.`];
  if (panel.ignores) lines.push(`Ignores variables: ${panel.ignores}.`);
  if (panel.note) lines.push(panel.note);
  return lines.join('\n');
}

function fieldConfig(panel) {
  const defaults = {
    unit: panel.unit,
    // Missing is not zero: never map null to 0.
    noValue: 'No data',
    color: { mode: panel.viz === 'stat' && panel.thresholds ? 'thresholds' : 'palette-classic' },
  };
  if (panel.min !== undefined) defaults.min = panel.min;
  if (panel.max !== undefined) defaults.max = panel.max;
  if (panel.decimals !== undefined) defaults.decimals = panel.decimals;
  if (panel.thresholds) {
    defaults.thresholds = {
      mode: 'absolute',
      steps: [{ color: 'green', value: null }, ...panel.thresholds.map(([value, color]) => ({ color, value }))],
    };
  }
  if (panel.link) defaults.links = [panel.link];
  const custom = {};
  if (panel.viz === 'timeseries') {
    Object.assign(custom, { drawStyle: 'line', lineWidth: 1, fillOpacity: panel.stack ? 20 : 8, showPoints: 'never', spanNulls: false });
    if (panel.stack) custom.stacking = { mode: 'normal', group: 'A' };
  }
  if (Object.keys(custom).length) defaults.custom = custom;
  return { defaults, overrides: [] };
}

function options(panel) {
  switch (panel.viz) {
    case 'stat':
      return {
        reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
        colorMode: panel.thresholds ? 'background' : 'none',
        graphMode: 'none',
        textMode: panel.textMode || 'auto',
        orientation: 'auto',
      };
    case 'bargauge':
      return {
        reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
        displayMode: 'gradient',
        orientation: 'horizontal',
        showUnfilled: true,
      };
    case 'piechart':
      return {
        reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
        pieType: 'donut',
        legend: { displayMode: 'table', placement: 'right', values: ['value'] },
      };
    case 'table':
      return { showHeader: true, cellHeight: 'sm', sortBy: panel.sortBy ? [panel.sortBy] : [] };
    case 'timeseries':
      return {
        legend: { displayMode: 'list', placement: 'bottom', showLegend: true },
        tooltip: { mode: 'multi', sort: 'desc' },
      };
    default:
      throw new Error(`unknown viz: ${panel.viz}`);
  }
}

function buildPanel(panel, id, gridPos) {
  const isTable = panel.viz === 'table';
  const instant = panel.instant ?? ['stat', 'bargauge', 'piechart', 'table'].includes(panel.viz);
  const targets = panel.targets.map((t, i) => ({
    datasource: DS,
    refId: String.fromCharCode(65 + i),
    expr: t.expr,
    legendFormat: t.legend ?? '__auto',
    instant,
    range: !instant,
    ...(isTable ? { format: 'table' } : {}),
  }));
  const out = {
    id,
    type: panel.viz,
    title: panel.title,
    description: panelDescription(panel),
    datasource: DS,
    gridPos,
    targets,
    fieldConfig: fieldConfig(panel),
    options: options(panel),
  };
  if (isTable && panel.transformations) out.transformations = panel.transformations;
  if (isTable && panel.overrides) out.fieldConfig.overrides = panel.overrides;
  return out;
}

function layoutRow(panels, nextId, y) {
  const built = [];
  let x = 0;
  let rowHeight = 0;
  for (const p of panels) {
    const w = p.w ?? 12;
    const h = p.h ?? 8;
    if (x + w > GRID_WIDTH) {
      y += rowHeight;
      x = 0;
      rowHeight = 0;
    }
    built.push(buildPanel(p, nextId.value++, { x, y, w, h }));
    x += w;
    rowHeight = Math.max(rowHeight, h);
  }
  return { built, nextY: y + rowHeight };
}

function rowPanel(title, id, y, collapsed, children) {
  return { id, type: 'row', title, collapsed, gridPos: { x: 0, y, w: GRID_WIDTH, h: 1 }, panels: collapsed ? children : [] };
}

function templating(def) {
  const list = [
    {
      name: 'ds',
      label: 'Data source',
      type: 'datasource',
      query: 'prometheus',
      current: {},
      hide: 0,
      refresh: 1,
      regex: '',
      includeAll: false,
      multi: false,
      options: [],
    },
  ];
  for (const name of VARIABLE_NAMES) {
    if (!def.variables.includes(name)) continue;
    const v = VARIABLES[name];
    list.push({
      name,
      label: v.label,
      type: 'query',
      datasource: DS,
      definition: v.definition,
      query: { query: v.definition, refId: `var_${name}`, qryType: 1 },
      refresh: 2,
      sort: 1,
      includeAll: true,
      allValue: '.*',
      multi: true,
      current: { selected: true, text: ['All'], value: ['$__all'] },
      options: [],
      regex: '',
      hide: 0,
    });
  }
  for (const [name, v] of Object.entries(TEXTBOX_VARIABLES)) {
    if (!def.variables.includes(name)) continue;
    list.push({
      name,
      label: v.label,
      type: 'textbox',
      query: v.default,
      current: { text: v.default, value: v.default },
      options: [{ selected: true, text: v.default, value: v.default }],
      hide: 0,
    });
  }
  return { list };
}

export function buildDashboard(def) {
  const nextId = { value: 1 };
  const panels = [];
  let y = 0;

  const summary = layoutRow(def.summary, nextId, y);
  panels.push(...summary.built);
  y = summary.nextY;

  const main = layoutRow(def.main, nextId, y);
  panels.push(...main.built);
  y = main.nextY;

  for (const [title, group, collapsedDefault] of [
    ['Supplemental', def.supplemental ?? [], true],
    ['Tier B: not emitted yet', def.tierB ?? [], true],
  ]) {
    if (!group.length) continue;
    const rowId = nextId.value++;
    const children = layoutRow(group, nextId, y + 1);
    panels.push(rowPanel(title, rowId, y, collapsedDefault, children.built));
    y += 1;
    if (!collapsedDefault) {
      panels.push(...children.built);
      y = children.nextY;
    }
  }

  return {
    uid: def.uid,
    title: def.title,
    description: def.description,
    tags: ['gh-aw', 'otel', ...(def.tags ?? [])],
    schemaVersion: 39,
    version: 1,
    editable: true,
    graphTooltip: 1,
    timezone: 'browser',
    refresh: '5m',
    time: { from: 'now-7d', to: 'now' },
    templating: templating(def),
    annotations: { list: [] },
    links: [{ ...ACTIONS_LINK, title: 'GitHub Actions', url: 'https://github.com/${gh_repo}/actions', type: 'link', icon: 'external link' }],
    panels,
  };
}

export const serialize = (dashboard) => JSON.stringify(dashboard, null, 2) + '\n';

export function generateAll() {
  return DEFINITIONS.map((def) => ({ file: `${def.uid}.json`, content: serialize(buildDashboard(def)) }));
}

function main() {
  const check = process.argv.includes('--check');
  let stale = 0;
  if (!check) mkdirSync(DASHBOARD_DIR, { recursive: true });
  for (const { file, content } of generateAll()) {
    const path = join(DASHBOARD_DIR, file);
    if (check) {
      let existing = '';
      try {
        existing = readFileSync(path, 'utf8');
      } catch {
        // missing counts as stale
      }
      if (existing !== content) {
        console.error(`STALE: ${file}`);
        stale++;
      }
    } else {
      writeFileSync(path, content);
      console.log(`wrote dashboards/${file}`);
    }
  }
  if (check) {
    if (stale) {
      console.error('Run `node observability/grafana/tools/generate.mjs` to regenerate.');
      process.exit(1);
    }
    console.log('dashboards are up to date');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
