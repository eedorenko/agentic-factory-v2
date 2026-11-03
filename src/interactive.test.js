const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { parseCommand, createSession } = require('./interactive');

const ITEMS = Array.from({ length: 12 }, (_, n) => ({ title: `Item ${n + 1}`, description: 'thing' }));

test('parseCommand handles queries and commands', () => {
  assert.deepStrictEqual(parseCommand('  foo bar '), { type: 'search', query: 'foo bar' });
  assert.deepStrictEqual(parseCommand(''), { type: 'empty' });
  assert.deepStrictEqual(parseCommand('/quit'), { type: 'quit' });
  assert.deepStrictEqual(parseCommand('/page 2'), { type: 'page', value: 2 });
  assert.deepStrictEqual(parseCommand('/limit 5'), { type: 'limit', value: 5 });
  assert.deepStrictEqual(parseCommand('/export CSV'), { type: 'export', format: 'csv' });
});

test('parseCommand rejects bad input', () => {
  for (const bad of ['/page', '/page x', '/page 0', '/limit -1', '/export xml', '/nope']) {
    assert.strictEqual(parseCommand(bad).type, 'error', bad);
  }
});

test('search shows highlighted results and summary', () => {
  const s = createSession(ITEMS);
  const out = s.handle('item');
  assert.ok(out[0].includes('\x1b[1;33mItem\x1b[0m'));
  assert.strictEqual(out[out.length - 1], '12 results found, showing page 1 of 2');
});

test('/page and /limit change session state', () => {
  const s = createSession(ITEMS);
  s.handle('item');
  const p2 = s.handle('/page 2');
  assert.strictEqual(s.state.page, 2);
  assert.strictEqual(p2.length, 3);
  assert.ok(s.handle('/page 9')[0].includes('out of range'));
  const l = s.handle('/limit 20');
  assert.strictEqual(s.state.limit, 20);
  assert.strictEqual(s.state.page, 1);
  assert.strictEqual(l[l.length - 1], '12 results found, showing page 1 of 1');
});

test('/export outputs current page and requires a search', () => {
  const s = createSession(ITEMS);
  assert.ok(s.handle('/export csv')[0].includes('No search yet'));
  s.handle('item 1');
  assert.ok(s.handle('/export csv')[0].startsWith('title,description\nItem 1,thing'));
  assert.strictEqual(JSON.parse(s.handle('/export json')[0])[0].title, 'Item 1');
});

test('/quit ends the session', () => {
  const s = createSession(ITEMS);
  s.handle('/quit');
  assert.strictEqual(s.state.done, true);
});

test('--interactive runs a REPL over stdin', () => {
  const out = execFileSync('node', [path.join(__dirname, 'index.js'), '--interactive'], {
    encoding: 'utf8',
    input: 'pagination\n/quit\n',
  });
  assert.ok(out.includes('search> '));
  assert.ok(out.includes('1 results found, showing page 1 of 1'));
});

test('commands buffered after /quit are ignored', async () => {
  const { PassThrough } = require('node:stream');
  const { runInteractive } = require('./interactive');
  const input = new PassThrough();
  const output = new PassThrough();
  let text = '';
  output.on('data', (d) => { text += d; });
  const done = runInteractive(ITEMS, { input, output });
  input.end('/quit\nItem\n/export json\n');
  await done;
  assert.ok(!text.includes('results found'));
  assert.ok(!text.includes('"title"'));
});
