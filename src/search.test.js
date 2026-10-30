const { describe, it } = require('node:test');
const assert = require('node:assert');
const { flattenNestedResults, groupByCategory, sortByRelevance, truncateDescription, searchItems, countMatches, paginate, formatSearchResults, exportToCSV, exportToJson, colorHighlight } = require('./search');

const testItems = Array.from({ length: 25 }, (_, i) => ({
  title: `Item ${i + 1}`,
  description: `Description for item ${i + 1}`,
}));

describe('searchItems', () => {
  it('should find items by title', () => {
    const results = searchItems(testItems, 'Item 1');
    assert.ok(results.length > 0);
  });

  it('should return empty array for empty query', () => {
    const results = searchItems(testItems, '');
    assert.strictEqual(results.length, 0);
  });

  it('should be case insensitive', () => {
    const results = searchItems(testItems, 'item 1');
    assert.ok(results.length > 0);
  });
});

describe('paginate', () => {
  it('should return correct page of items', () => {
    const result = paginate(testItems, 1, 10);
    assert.strictEqual(result.items.length, 10);
    assert.strictEqual(result.page, 1);
  });

  it('should calculate correct total pages', () => {
    // 25 items / 10 per page = 3 pages (ceil)
    const result = paginate(testItems, 1, 10);
    // This test currently FAILS because of the Math.floor bug
    assert.strictEqual(result.totalPages, 3);
  });

  it('should return items for the last page', () => {
    const result = paginate(testItems, 3, 10);
    assert.strictEqual(result.items.length, 5);
  });
});

describe('formatSearchResults', () => {
  it('should include summary', () => {
    const results = paginate(testItems, 1, 10);
    const formatted = formatSearchResults(results);
    assert.ok(formatted.summary.includes('page 1'));
  });

  it('should include total item count', () => {
    const formatted = formatSearchResults(paginate(testItems, 1, 10));
    assert.strictEqual(formatted.summary, 'Showing page 1 of 3 (25 items total)');
  });
});

describe('exportToCSV', () => {
  it('should export normal results', () => {
    const csv = exportToCSV({ items: [{ title: 'A', description: 'B' }, { title: 'C', description: 'D' }] });
    assert.strictEqual(csv, 'title,description\nA,B\nC,D');
  });

  it('should return only header for empty results', () => {
    assert.strictEqual(exportToCSV({ items: [] }), 'title,description');
  });

  it('should escape commas, quotes and newlines', () => {
    const csv = exportToCSV({ items: [{ title: 'a,b', description: 'say "hi"\nnow' }] });
    assert.strictEqual(csv, 'title,description\n"a,b","say ""hi""\nnow"');
  });
});

describe('exportToJson', () => {
  it('should export normal results compactly', () => {
    const json = exportToJson({ items: [{ title: 'A', description: 'B' }] });
    assert.strictEqual(json, '[{"title":"A","description":"B"}]');
  });

  it('should return [] for empty results', () => {
    assert.strictEqual(exportToJson({ items: [] }), '[]');
  });

  it('should drop extra fields', () => {
    const out = JSON.parse(exportToJson({ items: [{ id: 1, title: 'A', description: 'B', x: 2 }] }));
    assert.deepStrictEqual(out, [{ title: 'A', description: 'B' }]);
  });

  it('should round-trip commas and quotes', () => {
    const items = [{ title: 'a,b', description: 'say "hi"' }];
    assert.deepStrictEqual(JSON.parse(exportToJson({ items })), items);
  });
});

describe('colorHighlight', () => {
  const res = { page: 1, items: [{ title: 'Hello World', description: 'hello again, HELLO' }] };
  const y = m => `\x1b[1;33m${m}\x1b[0m`;

  it('wraps matches in yellow bold, case-insensitively, preserving casing', () => {
    const out = colorHighlight(res, 'hello');
    assert.strictEqual(out.items[0].title, `${y('Hello')} World`);
    assert.strictEqual(out.page, 1);
  });

  it('highlights the description and multiple occurrences', () => {
    assert.strictEqual(colorHighlight(res, 'hello').items[0].description, `${y('hello')} again, ${y('HELLO')}`);
  });

  it('escapes regex characters and does not mutate input', () => {
    const r = { items: [{ title: 'a.b axb', description: '' }] };
    assert.strictEqual(colorHighlight(r, 'a.b').items[0].title, `${y('a.b')} axb`);
    assert.strictEqual(r.items[0].title, 'a.b axb');
  });

  it('returns items unchanged for empty query or no match', () => {
    assert.deepStrictEqual(colorHighlight(res, '').items, res.items);
    assert.deepStrictEqual(colorHighlight(res, 'zzz').items, res.items);
  });
});

describe('truncateDescription', () => {
  it('truncates and appends ellipsis', () => {
    assert.strictEqual(truncateDescription('Hello world', 5), 'Hello...');
  });

  it('returns text unchanged when within limit', () => {
    assert.strictEqual(truncateDescription('Hello', 5), 'Hello');
    assert.strictEqual(truncateDescription('Hi', 10), 'Hi');
  });

  it('returns empty string for null/undefined', () => {
    assert.strictEqual(truncateDescription(null, 5), '');
    assert.strictEqual(truncateDescription(undefined, 5), '');
  });

  it('handles empty string', () => {
    assert.strictEqual(truncateDescription('', 5), '');
  });
});

describe('countMatches', () => {
  const items = [
    { title: 'Apple pie', description: 'dessert' },
    { title: 'Banana', description: 'fruit with apple flavor' },
    { title: 'Cherry', description: 'fruit' },
  ];

  it('counts several matches', () => {
    assert.strictEqual(countMatches(items, 'apple'), 2);
  });

  it('returns 0 for no matches', () => {
    assert.strictEqual(countMatches(items, 'zzz'), 0);
  });

  it('returns 0 for empty array', () => {
    assert.strictEqual(countMatches([], 'apple'), 0);
  });

  it('returns 0 for null input', () => {
    assert.strictEqual(countMatches(null, 'apple'), 0);
    assert.strictEqual(countMatches(undefined, 'apple'), 0);
  });
});

describe('sortByRelevance', () => {
  const data = [{ name: 'Banana' }, { name: 'apple pie' }, { name: 'Apricot' }, { name: 'APPLE' }];

  it('puts case-insensitive prefix matches first, keeping order', () => {
    assert.deepStrictEqual(sortByRelevance(data, 'app').map(r => r.name), ['apple pie', 'APPLE', 'Banana', 'Apricot']);
  });

  it('keeps order when nothing matches', () => {
    assert.deepStrictEqual(sortByRelevance(data, 'zzz'), data);
  });

  it('returns [] for null/undefined input', () => {
    assert.deepStrictEqual(sortByRelevance(null, 'a'), []);
    assert.deepStrictEqual(sortByRelevance(undefined, 'a'), []);
  });

  it('does not mutate the input', () => {
    const copy = data.map(d => ({ ...d }));
    const out = sortByRelevance(data, 'app');
    assert.notStrictEqual(out, data);
    assert.deepStrictEqual(data, copy);
  });
});

describe('groupByCategory', () => {
  it('groups items by category', () => {
    const a = { name: 'a', category: 'x' };
    const b = { name: 'b', category: 'y' };
    const c = { name: 'c', category: 'x' };
    const input = [a, b, c];
    const out = groupByCategory(input);
    assert.deepStrictEqual(out, { x: [a, c], y: [b] });
    assert.strictEqual(out.x[0], a);
    assert.strictEqual(input.length, 3);
  });

  it('returns empty object for empty results', () => {
    assert.deepStrictEqual(groupByCategory([]), {});
    assert.deepStrictEqual(groupByCategory(undefined), {});
  });

  it('puts items without category under uncategorized', () => {
    const a = { name: 'a' };
    const b = { name: 'b', category: '' };
    const c = { name: 'c', category: 'x' };
    assert.deepStrictEqual(groupByCategory([a, b, c]), { uncategorized: [a, b], x: [c] });
  });
});

describe('flattenNestedResults', () => {
  it('flattens nested results depth-first and strips children', () => {
    const input = { items: [{ id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }] }] }, { id: 5 }] };
    assert.deepStrictEqual(flattenNestedResults(input), [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
  });

  it('accepts a plain array', () => {
    assert.deepStrictEqual(flattenNestedResults([{ id: 1, children: [{ id: 2 }] }]), [{ id: 1 }, { id: 2 }]);
  });

  it('returns [] for empty results', () => {
    assert.deepStrictEqual(flattenNestedResults({ items: [] }), []);
    assert.deepStrictEqual(flattenNestedResults([]), []);
    assert.deepStrictEqual(flattenNestedResults(null), []);
  });

  it('keeps items without children as-is', () => {
    assert.deepStrictEqual(flattenNestedResults([{ id: 1 }, { id: 2 }]), [{ id: 1 }, { id: 2 }]);
  });

  it('handles 3+ levels of nesting', () => {
    const input = [{ id: 1, children: [{ id: 2, children: [{ id: 3, children: [{ id: 4 }] }] }] }];
    assert.deepStrictEqual(flattenNestedResults(input).map(i => i.id), [1, 2, 3, 4]);
  });
});
