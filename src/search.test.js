const { describe, it } = require('node:test');
const assert = require('node:assert');
const { searchItems, paginate, formatSearchResults, exportToCSV, exportToJson } = require('./search');

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

  it('should include total item count in summary', () => {
    const results = paginate(testItems, 1, 10);
    const formatted = formatSearchResults(results);
    assert.ok(formatted.summary.includes(`(${testItems.length} items total)`));
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
