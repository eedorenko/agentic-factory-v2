const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { COMMANDS, formatDryRun, executeCommand } = require('./commands');

for (const cmd of Object.keys(COMMANDS)) {
  test(`${cmd} --dry-run lists actions and summary`, () => {
    const out = execFileSync('node', [path.join(__dirname, 'index.js'), cmd, '--dry-run'], { encoding: 'utf8' });
    const lines = out.trimEnd().split('\n').slice(1);
    const n = COMMANDS[cmd].length;
    assert.strictEqual(lines.length, n + 1);
    COMMANDS[cmd].forEach((a, i) => assert.strictEqual(lines[i], `- ${a}`));
    assert.strictEqual(lines[n], `Dry run complete. ${n} actions would be performed.`);
  });
}

test('dry run does not use the execution format', () => {
  const logs = [];
  executeCommand('build', { dryRun: true, log: (l) => logs.push(l) });
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0], formatDryRun('build'));
});

test('--help documents --dry-run', () => {
  const out = execFileSync('node', [path.join(__dirname, 'index.js'), '--help'], { encoding: 'utf8' });
  assert.ok(out.includes('--dry-run'));
});

test('option values matching command names are not treated as commands', () => {
  const out = execFileSync('node', [path.join(__dirname, 'index.js'), '--search', 'build'], { encoding: 'utf8' });
  assert.ok(!out.includes('Dry run complete'));
  assert.ok(!out.includes('would'));
});
