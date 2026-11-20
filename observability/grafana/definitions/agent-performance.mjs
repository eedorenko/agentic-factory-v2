import { sel, inc, sum, ratio, quantile, counter, count, bucket, nonCacheInput, totalTokens, RANGE, RATE, LABELS, TABLE_ACTIONS_LINK } from './common.mjs';

const FJ = sel(); // workflow + job
const FM = sel({ model: true }); // + model (duration, agent duration, tokens)
const W = LABELS.workflow;
const M = LABELS.model;
const TS = LABELS.toolStatus;
const TOKEN_UNIT = '{token}';

export default {
  uid: 'gh-aw-agent-performance',
  title: 'gh-aw / Agent Performance',
  description: 'How hard do agents work, and where do tokens go? For workflow authors.',
  tags: ['agents'],
  variables: ['workflow', 'job', 'model', 'gh_repo'],
  summary: [
    {
      title: 'Turns p50 / p95',
      viz: 'stat',
      unit: '{turn}',
      w: 6,
      h: 5,
      textMode: 'value_and_name',
      question: 'How many agent turns does a typical and a slow run take? Default histogram buckets are coarse above 30 turns (see METRICS-PROPOSAL.md).',
      ignores: 'model',
      tier: 'A',
      targets: [
        { expr: quantile(0.5, 'agentTurns', FJ), legend: 'p50' },
        { expr: quantile(0.95, 'agentTurns', FJ), legend: 'p95' },
      ],
    },
    {
      title: 'Agent duration p95',
      viz: 'stat',
      unit: 's',
      w: 6,
      h: 5,
      question: 'How long do the slowest 5% of agent invocations take?',
      tier: 'A',
      targets: [{ expr: quantile(0.95, 'agentDuration', FM) }],
    },
    {
      title: 'Cache-read share',
      viz: 'stat',
      unit: 'percentunit',
      w: 6,
      h: 5,
      question: 'What share of input tokens were served from cache? Higher is cheaper.',
      ignores: 'model',
      tier: 'A',
      targets: [{ expr: ratio(sum(inc('tokensCacheRead', FJ)), sum(inc('tokensInput', FJ))) }],
    },
    {
      title: 'Tool-call failure rate',
      viz: 'stat',
      unit: 'percentunit',
      w: 6,
      h: 5,
      thresholds: [[0.02, 'orange'], [0.1, 'red']],
      question: 'What share of tool calls ended with status "error"? Job-level aggregate: tool name is not a metric attribute.',
      ignores: 'model',
      tier: 'A',
      targets: [{ expr: ratio(sum(inc('toolCalls', sel({ extra: [`${TS}="error"`] }))), sum(inc('toolCalls', FJ))) }],
    },
  ],
  main: [
    {
      title: 'Tokens by type',
      viz: 'timeseries',
      unit: TOKEN_UNIT,
      stack: true,
      w: 14,
      h: 9,
      question: 'Where do tokens go over time? Input already includes cache, so non-cache input = input - cache read - cache write.',
      ignores: 'model',
      tier: 'A',
      targets: [
        { expr: `${nonCacheInput(FJ, RATE, 'rate')} * 3600`, legend: 'input (non-cache)' },
        { expr: `${sum(`rate(${counter('tokensCacheRead')}${FJ}[${RATE}])`)} * 3600`, legend: 'cache read' },
        { expr: `${sum(`rate(${counter('tokensCacheWrite')}${FJ}[${RATE}])`)} * 3600`, legend: 'cache write' },
        { expr: `${sum(`rate(${counter('tokensOutput')}${FJ}[${RATE}])`)} * 3600`, legend: 'output' },
      ],
    },
    {
      title: 'Tokens by model',
      viz: 'piechart',
      unit: TOKEN_UNIT,
      w: 10,
      h: 9,
      question: 'Which models consume the tokens (input + output)?',
      tier: 'A',
      targets: [{ expr: totalTokens(FM, RANGE, M), legend: `{{${M}}}` }],
    },
  ],
  supplemental: [
    {
      title: 'Workflows ranked by tokens per job',
      viz: 'table',
      unit: TOKEN_UNIT,
      w: 24,
      h: 9,
      link: TABLE_ACTIONS_LINK,
      question: 'Which workflows spend the most tokens per job run? Tokens are divided by the job count of the same workflow.',
      ignores: 'model',
      tier: 'A',
      instant: true,
      transformations: [
        { id: 'merge', options: {} },
        { id: 'organize', options: { excludeByName: { Time: true }, renameByName: { 'Value #A': 'Tokens', 'Value #B': 'Jobs', 'Value #C': 'Tokens per job' } } },
      ],
      sortBy: { displayName: 'Tokens per job', desc: true },
      targets: [
        { expr: totalTokens(FJ, RANGE, W) },
        { expr: sum(`increase(${count('jobDuration')}${FJ}[${RANGE}])`, W) },
        { expr: `(${totalTokens(FJ, RANGE, W)}) / ${sum(`increase(${count('jobDuration')}${FJ}[${RANGE}])`, W)}` },
      ],
    },
    {
      title: 'Tool calls by status',
      viz: 'timeseries',
      unit: 'short',
      stack: true,
      w: 12,
      h: 8,
      question: 'How many tool calls succeed ("ok") vs fail ("error")? Job-level aggregate only.',
      ignores: 'model',
      tier: 'A',
      targets: [{ expr: `${sum(`rate(${counter('toolCalls')}${FJ}[${RATE}])`, TS)} * 3600`, legend: `{{${TS}}}` }],
    },
    {
      title: 'Agent duration p50 / p95',
      viz: 'timeseries',
      unit: 's',
      w: 12,
      h: 8,
      question: 'Is agent invocation time drifting?',
      tier: 'A',
      targets: [
        { expr: quantile(0.5, 'agentDuration', FM, RATE, 'rate'), legend: 'p50' },
        { expr: quantile(0.95, 'agentDuration', FM, RATE, 'rate'), legend: 'p95' },
      ],
    },
  ],
};
