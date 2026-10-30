const DESCRIPTION = 'agentic-factory-app: Simple app for testing agentic factory pipeline';
const QUIT_TIP = 'Tip: Press Ctrl+Q to quit at any time.';

function getHelpText() {
  return [
    DESCRIPTION,
    '',
    'Usage: node src/index.js [options]',
    '',
    'Options:',
    '  --help    Show this help text',
    '',
    QUIT_TIP,
  ].join('\n');
}

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
  console.log(DESCRIPTION);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { formatTimestamp, getHelpText, main, QUIT_TIP };
