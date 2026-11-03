const { renderFooter } = require('./footer');
const { searchItems, colorHighlight, limitResults, DEFAULT_LIMIT } = require('./search');

const { runInteractive } = require('./interactive');

const DESCRIPTION = 'agentic-factory-app: Simple app for testing agentic factory pipeline';
const QUIT_TIP = 'Tip: Press Ctrl+Q to quit at any time.';

function getHelpText() {
  return [
    DESCRIPTION,
    '',
    'Usage: node src/index.js [options]',
    '',
    'Options:',
    '  --help           Show this help text',
    '  --search <term>  Search sample items and highlight matches',
    `  --limit N        Show at most N results (default: ${DEFAULT_LIMIT})`,
    '  --no-limit       Show all results',
    '  --interactive    Start an interactive search session',
    '                   Commands: /page N, /limit N, /export csv|json, /quit',
    '',
    QUIT_TIP,
  ].join('\n');
}

const SAMPLE_ITEMS = [
  { title: 'Color support', description: 'Highlight matches in search results' },
  { title: 'Pagination', description: 'Split results into pages' },
  { title: 'CSV export', description: 'Export search results to CSV' },
  ...Array.from({ length: 25 }, (_, n) => ({
    title: `Item ${n + 1}`,
    description: `Description for item ${n + 1}`,
  })),
];

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function main(argv) {
  console.log(`Started at: ${formatTimestamp()}`);
  if (argv.includes('--help')) {
    console.log(getHelpText());
    return;
  }
  if (argv.includes('--interactive')) {
    return runInteractive(SAMPLE_ITEMS);
  }
  const i = argv.indexOf('--search');
  if (i !== -1) {
    const query = argv[i + 1];
    let limit = DEFAULT_LIMIT;
    const li = argv.indexOf('--limit');
    if (li !== -1) {
      limit = Number(argv[li + 1]);
      if (!Number.isInteger(limit) || limit < 0) {
        console.error('Error: --limit requires a non-negative integer');
        process.exitCode = 1;
        return;
      }
    }
    if (argv.includes('--no-limit')) limit = Infinity;
    const found = limitResults(searchItems(SAMPLE_ITEMS, query), limit);
    const { items } = colorHighlight({ items: found }, query);
    for (const item of items) console.log(`${item.title} - ${item.description}`);
    return;
  }
  console.log(DESCRIPTION);
  console.log(renderFooter('agentic-factory-app'));
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { formatTimestamp, getHelpText, main, QUIT_TIP };
