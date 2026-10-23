/**
 * Search module with pagination support.
 */

function searchItems(items, query) {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  return items.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery)
  );
}

function paginate(items, page, pageSize = 10) {
  const totalPages = Math.ceil(items.length / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    page,
    pageSize,
    totalItems: items.length,
    totalPages,
  };
}

function formatSearchResults(results) {
  return {
    ...results,
    summary: `Showing page ${results.page} of ${results.totalPages} (${results.totalItems} items total)`,
  };
}

function escapeCSVField(value) {
  const str = value == null ? '' : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function exportToCSV(results) {
  const rows = (results && results.items) || [];
  const lines = ['title,description'];
  for (const item of rows) {
    lines.push(`${escapeCSVField(item.title)},${escapeCSVField(item.description)}`);
  }
  return lines.join('\n');
}

function exportToJson(results) {
  const rows = (results && results.items) || [];
  return JSON.stringify(rows.map(({ title, description }) => ({ title, description })));
}

function highlightResults(results, query) {
  const rows = (results && results.items) || [];
  if (!query) return { ...results, items: rows.map(item => ({ ...item })) };
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const mark = text => (typeof text === 'string' ? text.replace(re, m => `<mark>${m}</mark>`) : text);
  return {
    ...results,
    items: rows.map(item => ({ ...item, title: mark(item.title), description: mark(item.description) })),
  };
}

function coloResults(results, query) {
  const rows = (results && results.items) || [];
  if (!query) return { ...results, items: rows.map(item => ({ ...item })) };
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const color = text => (typeof text === 'string' ? text.replace(re, m => `<span style="color:red">${m}</span>`) : text);
  return {
    ...results,
    items: rows.map(item => ({ ...item, title: color(item.title), description: color(item.description) })),
  };
}

module.exports = { searchItems, paginate, formatSearchResults, exportToCSV, exportToJson, highlightResults, coloResults };
