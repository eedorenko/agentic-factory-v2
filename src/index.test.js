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

const runSearch = (term) =>
  execFileSync('node', [path.join(__dirname, 'index.js'), '--search', term], { encoding: 'utf8' });

test('--search highlights title matches', () => {
  const out = runSearch('pagination');
  assert.ok(out.includes('\x1b[1;33mPagination\x1b[0m'));
  assert.ok(!out.includes('Color support'));
});

test('--search highlights description matches', () => {
  const out = runSearch('csv');
  assert.ok(out.includes('\x1b[1;33mCSV\x1b[0m export'));
  assert.ok(out.includes('Export search results to \x1b[1;33mCSV\x1b[0m'));
});

test('--search with no matches prints nothing', () => {
  assert.strictEqual(runSearch('zzzz'), '');
});
