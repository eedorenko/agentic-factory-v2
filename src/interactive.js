const readline = require('node:readline');
const {
  searchItems, paginate, colorHighlight, exportToCSV, exportToJson, DEFAULT_LIMIT,
} = require('./search');

const PROMPT = 'search> ';

function parseCommand(line) {
  const text = String(line == null ? '' : line).trim();
  if (text === '') return { type: 'empty' };
  if (!text.startsWith('/')) return { type: 'search', query: text };
  const [name, ...args] = text.slice(1).split(/\s+/);
  switch (name.toLowerCase()) {
    case 'quit':
      return { type: 'quit' };
    case 'page':
    case 'limit': {
      const n = Number(args[0]);
      if (args.length !== 1 || !Number.isInteger(n) || n < 1) {
        return { type: 'error', message: `Usage: /${name.toLowerCase()} N (positive integer)` };
      }
      return { type: name.toLowerCase(), value: n };
    }
    case 'export': {
      const format = (args[0] || '').toLowerCase();
      if (args.length !== 1 || (format !== 'csv' && format !== 'json')) {
        return { type: 'error', message: 'Usage: /export csv|json' };
      }
      return { type: 'export', format };
    }
    default:
      return { type: 'error', message: `Unknown command: /${name}` };
  }
}

function createSession(items, { limit = DEFAULT_LIMIT } = {}) {
  const state = { query: null, page: 1, limit, matches: [], done: false };

  function view() {
    return paginate(state.matches, state.page, state.limit);
  }

  function render() {
    const results = view();
    const { items: shown } = colorHighlight(results, state.query);
    const lines = shown.map((item) => `${item.title} - ${item.description}`);
    const total = results.totalItems;
    const pages = Math.max(results.totalPages, 1);
    lines.push(`${total} results found, showing page ${state.page} of ${pages}`);
    return lines;
  }

  function handle(line) {
    const cmd = parseCommand(line);
    switch (cmd.type) {
      case 'empty':
        return [];
      case 'quit':
        state.done = true;
        return [];
      case 'error':
        return [cmd.message];
      case 'search':
        state.query = cmd.query;
        state.page = 1;
        state.matches = searchItems(items, cmd.query);
        return render();
      case 'page': {
        if (state.query === null) return ['No search yet. Type a query first.'];
        const pages = Math.max(view().totalPages, 1);
        if (cmd.value > pages) return [`Page ${cmd.value} out of range (1-${pages})`];
        state.page = cmd.value;
        return render();
      }
      case 'limit':
        state.limit = cmd.value;
        state.page = 1;
        return state.query === null ? [`Limit set to ${cmd.value}`] : render();
      case 'export': {
        if (state.query === null) return ['No search yet. Type a query first.'];
        const results = view();
        return [cmd.format === 'csv' ? exportToCSV(results) : exportToJson(results)];
      }
      default:
        return [];
    }
  }

  return { state, handle };
}

function runInteractive(items, { input = process.stdin, output = process.stdout, limit } = {}) {
  const session = createSession(items, { limit });
  const rl = readline.createInterface({ input, output, prompt: PROMPT });
  return new Promise((resolve) => {
    rl.on('line', (line) => {
      if (session.state.done) return;
      for (const out of session.handle(line)) output.write(`${out}\n`);
      if (session.state.done) rl.close();
      else rl.prompt();
    });
    rl.on('close', resolve);
    rl.on('SIGINT', () => rl.close());
    rl.prompt();
  });
}

module.exports = { PROMPT, parseCommand, createSession, runInteractive };
