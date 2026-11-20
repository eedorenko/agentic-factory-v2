// SYNTHETIC DATA ONLY. Serves fake gh-aw metrics in Prometheus exposition format so the
// dashboards can be exercised when no real gh-aw telemetry is available. Not for upstream.
//
//   node observability/grafana/tools/seed-metrics.mjs [--port 9101]
//
// Point a Prometheus scrape job at <host>:9101/metrics. Counters grow on every scrape, so
// rate()/increase() show activity. Label names/values match the expected gh-aw mapping.
import { createServer } from 'node:http';

const port = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 9101);

const workflows = ['triager', 'executor', 'reviewer', 'orchestrator'];
const jobs = ['agent', 'safe_outputs', 'detection'];
const models = ['claude-sonnet-5.5', 'gpt-5'];
const engines = { triager: 'copilot', executor: 'copilot', reviewer: 'claude', orchestrator: 'copilot' };
const results = ['success', 'failure', 'timed_out', 'cancelled'];
const durationBuckets = [1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600];
const turnBuckets = [1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600];

const state = new Map(); // series key -> number
const lbl = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(',');
const bump = (name, labels, by = 1) => {
  const key = `${name}{${lbl(labels)}}`;
  state.set(key, (state.get(key) ?? 0) + by);
};
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];

function observe(base, buckets, labels, value) {
  for (const b of buckets) if (value <= b) bump(`${base}_bucket`, { ...labels, le: b });
  bump(`${base}_bucket`, { ...labels, le: '+Inf' });
  bump(`${base}_count`, labels);
  bump(`${base}_sum`, labels, value);
}

function tick() {
  for (const wf of workflows) {
    if (Math.random() < 0.3) continue;
    const base = { gh_aw_workflow_name: wf, gh_aw_job_name: 'agent' };
    const failed = Math.random() < (wf === 'executor' ? 0.25 : 0.08);
    const result = failed ? pick(['failure', 'failure', 'timed_out', 'cancelled']) : 'success';
    const model = pick(models);
    observe('gh_aw_job_duration_seconds', durationBuckets, { ...base, cicd_pipeline_task_run_result: result, gh_aw_engine_id: engines[wf], gen_ai_request_model: model }, rnd(20, 900));
    if (failed) bump('gh_aw_job_errors_total', { ...base, cicd_pipeline_task_run_result: result });
    observe('gh_aw_agent_turns', turnBuckets, base, Math.round(rnd(2, 70)));
    const errType = failed && Math.random() < 0.5 ? pick(['timeout', 'rate_limit', 'model_error']) : '';
    observe('gen_ai_invoke_agent_duration_seconds', [1, 5, 15, 30, 60, 120, 300, 600], { ...base, gen_ai_request_model: model, error_type: errType }, rnd(10, 500));
    const input = Math.round(rnd(20000, 400000));
    bump('gen_ai_client_inference_usage_input_tokens_total', { ...base, gen_ai_request_model: model }, input);
    bump('gen_ai_client_inference_usage_cache_read_input_tokens_total', { ...base, gen_ai_request_model: model }, Math.round(input * rnd(0.3, 0.8)));
    bump('gen_ai_client_inference_usage_cache_write_input_tokens_total', { ...base, gen_ai_request_model: model }, Math.round(input * rnd(0, 0.1)));
    bump('gen_ai_client_inference_usage_output_tokens_total', { ...base, gen_ai_request_model: model }, Math.round(rnd(1000, 20000)));
    const calls = Math.round(rnd(5, 60));
    bump('gh_aw_tool_calls_total', { ...base, gh_aw_tool_status: 'ok' }, calls);
    if (Math.random() < 0.4) bump('gh_aw_tool_calls_total', { ...base, gh_aw_tool_status: 'error' }, Math.round(rnd(1, 4)));
    // The reviewer burns tokens without ever producing items, so the "waste" table has a row.
    if (wf !== 'reviewer' && !failed) bump('gh_aw_workflow_output_items_total', { ...base, gh_aw_safe_output_type: pick(['add_comment', 'create_pull_request', 'add_labels']) }, Math.round(rnd(1, 3)));
    if (failed && Math.random() < 0.15) bump('gh_aw_ai_credits_rate_limit_errors_total', base);
    if (failed && Math.random() < 0.1) bump('gh_aw_ai_credits_limit_exceeded_total', base);
  }
}

function render() {
  const lines = ['# SYNTHETIC gh-aw metrics (seed-metrics.mjs); do not use for real analysis'];
  for (const [key, value] of state) lines.push(`${key} ${value}`);
  return lines.join('\n') + '\n';
}

tick();
setInterval(tick, 15000);
createServer((req, res) => {
  if (req.url === '/metrics') {
    tick();
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(render());
  } else {
    res.writeHead(404).end();
  }
}).listen(port, () => console.log(`synthetic gh-aw metrics on :${port}/metrics`));

export { results };
