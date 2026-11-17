const COMMANDS = {
  run: ['Load sample items', 'Start the application'],
  build: ['Validate sources in src/', 'Bundle application files', 'Write build output to dist/'],
  deploy: ['Run build', 'Upload build output to the target environment', 'Verify deployment health'],
};

function getPlannedActions(command) {
  return COMMANDS[command] ? [...COMMANDS[command]] : null;
}

function formatDryRun(command) {
  const actions = getPlannedActions(command);
  const lines = actions.map((a) => `- ${a}`);
  lines.push(`Dry run complete. ${actions.length} actions would be performed.`);
  return lines.join('\n');
}

function executeCommand(command, { dryRun = false, log = console.log } = {}) {
  if (dryRun) {
    log(formatDryRun(command));
    return;
  }
  for (const action of getPlannedActions(command)) log(`* ${action}`);
}

module.exports = { COMMANDS, getPlannedActions, formatDryRun, executeCommand };
