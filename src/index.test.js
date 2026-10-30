const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { getHelpText, QUIT_TIP } = require('./index');

test('help text ends with the quit tip', () => {
  assert.strictEqual(QUIT_TIP, 'Tip: Press Ctrl+Q to quit at any time.');
  assert.ok(getHelpText().endsWith(QUIT_TIP));
});

test('--help prints tip as last line', () => {
  const out = execFileSync('node', [path.join(__dirname, 'index.js'), '--help'], { encoding: 'utf8' });
  assert.strictEqual(out.trimEnd().split('\n').pop(), QUIT_TIP);
});

test('default output shows version in footer', () => {
  const out = execFileSync('node', [path.join(__dirname, 'index.js')], { encoding: 'utf8' });
  assert.ok(out.includes('v1.0.0'));
});

const run = args => execFileSync('node', [path.join(__dirname, 'index.js'), ...args], { encoding: 'utf8' }).trim().split('\n');

test('--search --limit 5 shows at most 5 results', () => {
  assert.strictEqual(run(['--search', 'item', '--limit', '5']).length, 5);
});

test('--search defaults to 10 results', () => {
  assert.strictEqual(run(['--search', 'item']).length, 10);
});

test('--no-limit shows all results', () => {
  assert.strictEqual(run(['--search', 'item', '--no-limit']).length, 25);
});
