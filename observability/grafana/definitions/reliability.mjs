import { sel, inc, sum, ratio, counter, count, RANGE, RATE, LABELS, TABLE_ACTIONS_LINK, ACTIONS_LINK } from './common.mjs';

const FJ = sel();
const FR = sel({ result: true }); // errors carry the result label
const FM = sel({ model: true });
const W = LABELS.workflow;
const R = LABELS.result;
const ET = LABELS.errorType;
const TIMED_OUT = sel({ result: true, extra: [`${R}="timed_out"`] });

const errors = (sel_, range = RANGE, labels = '') => sum(`increase(${counter('jobErrors')}${sel_}[${range}])`, labels);
const jobCount = (sel_, range = RANGE, labels = '') => sum(`increase(${count('jobDuration')}${sel_}[${range}])`, labels);

export default {
  uid: 'gh-aw-reliability',
  title: 'gh-aw / Reliability',
  description: 'What fails, at which stage, and can the telemetry be trusted? For SRE.',
  tags: ['reliability'],
  variables: ['workflow', 'job', 'model', 'result', 'gh_repo'],
  summary: [
    {
      title: 'Errors by result',
      viz: 'piechart',
      unit: 'short',
      w: 6,
      h: 6,
      question: 'How do job errors split into failure, timed_out and cancelled?',
      tier: 'A',
      targets: [{ expr: errors(FR, RANGE, R), legend: `{{${R}}}` }],
    },
    {
      title: 'Timed-out jobs',
      viz: 'stat',
      unit: 'short',
      w: 6,
      h: 6,
      thresholds: [[1, 'orange'], [4, 'red']],
      question: 'How many jobs hit their timeout in the selected range?',
      ignores: 'result (fixed to timed_out)',
      tier: 'A',
      targets: [{ expr: errors(TIMED_OUT) }],
    },
    {
      title: 'Credit limit / rate-limit events',
      viz: 'stat',
      unit: 'short',
      w: 6,
      h: 6,
      thresholds: [[1, 'orange']],
      textMode: 'value_and_name',
      question: 'How often did runs hit an AI credit limit or a rate limit?',
      ignores: 'result',
      tier: 'A',
      targets: [
        { expr: sum(inc('creditsLimitExceeded', FJ)), legend: 'limit exceeded' },
        { expr: sum(inc('creditsRateLimit', FJ)), legend: 'rate limited' },
      ],
    },
    {
      title: 'OTLP export failures',
      viz: 'stat',
      unit: 'short',
      w: 6,
      h: 6,
      thresholds: [[1, 'red']],
      question: 'Is gh-aw failing to export telemetry? Anything above 0 means these dashboards may under-report.',
      ignores: 'all variables (not workflow-scoped)',
      tier: 'A',
      targets: [{ expr: sum(`increase(${counter('otlpFailures')}[${RANGE}])`) }],
    },
  ],
  main: [
    {
      title: 'Error rate by workflow (top 10)',
      viz: 'bargauge',
      unit: 'percentunit',
      min: 0,
      max: 1,
      w: 12,
      h: 9,
      link: ACTIONS_LINK,
      question: 'Which workflows have the highest share of failed jobs? Click a bar to open the workflow in GitHub Actions.',
      ignores: 'model, result',
      tier: 'A',
      targets: [{ expr: `topk(10, ${ratio(errors(FJ, RANGE, W), jobCount(FJ, RANGE, W))})`, legend: `{{${W}}}` }],
    },
    {
      title: 'Agent failures by error type',
      viz: 'bargauge',
      unit: 'short',
      w: 12,
      h: 9,
      question: 'Why do agent invocations fail? Only invocations with a non-empty error_type are counted.',
      tier: 'A',
      targets: [{ expr: sum(`increase(${count('agentDuration')}${sel({ model: true, extra: [`${ET}!=""`] })}[${RANGE}])`, ET), legend: `{{${ET}}}` }],
    },
  ],
  supplemental: [
    {
      title: 'Errors over time by result',
      viz: 'timeseries',
      unit: 'short',
      stack: true,
      w: 12,
      h: 8,
      question: 'When did errors happen?',
      tier: 'A',
      targets: [{ expr: `${sum(`rate(${counter('jobErrors')}${FR}[${RATE}])`, R)} * 3600`, legend: `{{${R}}}` }],
    },
    {
      title: 'Telemetry heartbeat (jobs reported per hour)',
      viz: 'timeseries',
      unit: 'short',
      w: 12,
      h: 8,
      question: 'Tells "no failures" apart from "no data": a flat zero here means no jobs were reported at all.',
      ignores: 'result',
      tier: 'A',
      targets: [{ expr: `${sum(`rate(${count('jobDuration')}${FJ}[${RATE}])`)} * 3600`, legend: 'jobs / hour' }],
    },
    {
      title: 'Agent failure ratio by model',
      viz: 'bargauge',
      unit: 'percentunit',
      min: 0,
      max: 1,
      w: 24,
      h: 7,
      question: 'Which models see the most failed agent invocations?',
      tier: 'A',
      targets: [{
        expr: ratio(
          sum(`increase(${count('agentDuration')}${sel({ model: true, extra: [`${ET}!=""`] })}[${RANGE}])`, LABELS.model),
          sum(`increase(${count('agentDuration')}${FM}[${RANGE}])`, LABELS.model),
        ),
        legend: `{{${LABELS.model}}}`,
      }],
    },
  ],
};
