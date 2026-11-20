import { sel, inc, sum, ratio, quantile, counter, count, bucket, RANGE, RATE, LABELS, ACTIONS_LINK, TABLE_ACTIONS_LINK } from './common.mjs';

const F = sel({ engine: true, result: true });
const FJ = sel(); // workflow + job only (series without engine/result labels)
const W = LABELS.workflow;
const R = LABELS.result;
const IGN_RATIO = 'engine, model, result (counters in the ratio do not all carry them)';

const errors = (sel_, range = RANGE, labels = '') => sum(`increase(${counter('jobErrors')}${sel_}[${range}])`, labels);
const jobCount = (sel_, range = RANGE, labels = '') => sum(`increase(${count('jobDuration')}${sel_}[${range}])`, labels);

export default {
  uid: 'gh-aw-operations-overview',
  title: 'gh-aw / Operations Overview',
  description: 'Is the agentic-workflow fleet healthy, slow, and producing work? For on-call and maintainers.',
  tags: ['operations'],
  variables: ['workflow', 'job', 'engine', 'result', 'gh_repo'],
  summary: [
    {
      title: 'Jobs completed',
      viz: 'stat',
      unit: 'short',
      w: 6,
      h: 5,
      question: 'How many gh-aw jobs finished in the selected range?',
      tier: 'A',
      targets: [{ expr: jobCount(F) }],
    },
    {
      title: 'Failure rate',
      viz: 'stat',
      unit: 'percentunit',
      w: 6,
      h: 5,
      thresholds: [[0.05, 'orange'], [0.2, 'red']],
      question: 'What share of jobs ended in failure, timeout or cancellation? Shows No data (not 0%) when no jobs ran.',
      ignores: IGN_RATIO,
      tier: 'A',
      targets: [{ expr: ratio(errors(FJ), jobCount(FJ)) }],
    },
    {
      title: 'p95 job duration',
      viz: 'stat',
      unit: 's',
      w: 6,
      h: 5,
      question: 'How long do the slowest 5% of jobs take? Default buckets are coarse above 1 hour.',
      tier: 'A',
      targets: [{ expr: quantile(0.95, 'jobDuration', F) }],
    },
    {
      title: 'Safe-output items',
      viz: 'stat',
      unit: 'short',
      w: 6,
      h: 5,
      question: 'How many safe-output items (comments, PRs, labels, ...) did workflows produce?',
      ignores: 'engine, result',
      tier: 'A',
      targets: [{ expr: sum(inc('outputItems', FJ)) }],
    },
  ],
  main: [
    {
      title: 'Failure rate by workflow (top 10)',
      viz: 'bargauge',
      unit: 'percentunit',
      min: 0,
      max: 1,
      w: 10,
      h: 9,
      link: ACTIONS_LINK,
      question: 'Which workflows fail most often? Click a bar to open the workflow in GitHub Actions.',
      ignores: IGN_RATIO,
      tier: 'A',
      targets: [{ expr: `topk(10, ${ratio(errors(FJ, RANGE, W), jobCount(FJ, RANGE, W))})`, legend: `{{${W}}}` }],
    },
    {
      title: 'Job duration p50 / p95',
      viz: 'timeseries',
      unit: 's',
      w: 14,
      h: 9,
      question: 'Is job duration drifting up or spiking?',
      tier: 'A',
      targets: [
        { expr: quantile(0.5, 'jobDuration', F, RATE, 'rate'), legend: 'p50' },
        { expr: quantile(0.95, 'jobDuration', F, RATE, 'rate'), legend: 'p95' },
      ],
    },
  ],
  supplemental: [
    {
      title: 'Jobs per hour by result',
      viz: 'timeseries',
      unit: 'short',
      stack: true,
      w: 12,
      h: 8,
      question: 'What is the throughput, and how does the result mix change over time?',
      tier: 'A',
      targets: [{ expr: `${sum(`rate(${count('jobDuration')}${F}[${RATE}])`, R)} * 3600`, legend: `{{${R}}}` }],
    },
    {
      title: 'Safe-output items by type',
      viz: 'timeseries',
      unit: 'short',
      stack: true,
      w: 12,
      h: 8,
      question: 'What kinds of output are workflows producing?',
      ignores: 'engine, result',
      tier: 'A',
      targets: [{ expr: `${sum(`rate(${counter('outputItems')}${FJ}[${RATE}])`, LABELS.outputType)} * 3600`, legend: `{{${LABELS.outputType}}}` }],
    },
    {
      title: 'Workflows overview',
      viz: 'table',
      unit: 'short',
      w: 24,
      h: 8,
      link: TABLE_ACTIONS_LINK,
      question: 'Per-workflow jobs, failures and p95 duration in the selected range. Click a workflow to open it in GitHub Actions.',
      ignores: IGN_RATIO,
      tier: 'A',
      instant: true,
      transformations: [
        { id: 'merge', options: {} },
        {
          id: 'organize',
          options: {
            excludeByName: { Time: true },
            renameByName: { 'Value #A': 'Jobs', 'Value #B': 'Failures', 'Value #C': 'p95 duration' },
          },
        },
      ],
      overrides: [
        { matcher: { id: 'byName', options: 'p95 duration' }, properties: [{ id: 'unit', value: 's' }] },
      ],
      sortBy: { displayName: 'Jobs', desc: true },
      targets: [
        { expr: jobCount(FJ, RANGE, W) },
        { expr: errors(FJ, RANGE, W) },
        { expr: `histogram_quantile(0.95, sum by (le, ${W}) (increase(${bucket('jobDuration')}${FJ}[${RANGE}])))` },
      ],
    },
  ],
};
