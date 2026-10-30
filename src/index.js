const { renderFooter } = require('./footer');
const { searchItems, colorHighlight } = require('./search');

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
    '',
    QUIT_TIP,
  ].join('\n');
}

const SAMPLE_ITEMS = [
  { title: 'Color support', description: 'Highlight matches in search results' },
  { title: 'Pagination', description: 'Split results into pages' },
  { title: 'CSV export', description: 'Export search results to CSV' },
];

function main(argv) {
  if (argv.includes('--help')) {
    console.log(getHelpText());
    return;
  }
  const i = argv.indexOf('--search');
  if (i !== -1) {
    const query = argv[i + 1];
    const { items } = colorHighlight({ items: searchItems(SAMPLE_ITEMS, query) }, query);
    for (const item of items) console.log(`${item.title} - ${item.description}`);
    return;
  }
  console.log(DESCRIPTION);
  console.log(renderFooter('agentic-factory-app'));
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { getHelpText, main, QUIT_TIP };
