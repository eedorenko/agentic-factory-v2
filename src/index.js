const { renderFooter } = require('./footer');
const { searchItems, limitResults, DEFAULT_LIMIT } = require('./search');

const SAMPLE_ITEMS = Array.from({ length: 25 }, (_, i) => ({
  title: `Item ${i + 1}`,
  description: `Description for item ${i + 1}`,
}));

const DESCRIPTION = 'agentic-factory-app: Simple app for testing agentic factory pipeline';
const QUIT_TIP = 'Tip: Press Ctrl+Q to quit at any time.';

function getHelpText() {
  return [
    DESCRIPTION,
    '',
    'Usage: node src/index.js [options]',
    '',
    'Options:',
    '  --help          Show this help text',
    '  --search TERM   Search sample items for TERM',
    `  --limit N       Show at most N results (default: ${DEFAULT_LIMIT})`,
    '  --no-limit      Show all results',
    '',
    QUIT_TIP,
  ].join('\n');
}

function main(argv) {
  if (argv.includes('--help')) {
    console.log(getHelpText());
    return;
  }
  const si = argv.indexOf('--search');
  if (si !== -1) {
    const term = argv[si + 1];
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
    for (const item of limitResults(searchItems(SAMPLE_ITEMS, term), limit)) {
      console.log(`${item.title}: ${item.description}`);
    }
    return;
  }
  console.log(DESCRIPTION);
  console.log(renderFooter('agentic-factory-app'));
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { getHelpText, main, QUIT_TIP };
