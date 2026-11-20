# gh-aw Grafana dashboards

Four importable Grafana dashboards for the OpenTelemetry metrics emitted by gh-aw
(see `specs/grafana-dashboards-spec.md` for the design).

| Dashboard | Audience | Question |
| --- | --- | --- |
| `gh-aw / Operations Overview` | on-call, maintainers | Is the fleet healthy, slow, and producing work? |
| `gh-aw / Agent Performance` | workflow authors | How hard do agents work, and where do tokens go? |
| `gh-aw / Cost & Efficiency` | budget owners | What does it cost, and where is it wasted? |
| `gh-aw / Reliability` | SRE | What fails, and can the telemetry be trusted? |

## Layout

```
definitions/*.mjs        source of truth (panels, queries, units); common.mjs holds the metric name map
dashboards/*.json        generated, importable into Grafana (do not edit by hand)
alerts/alerts.rules.yml  Prometheus alert rules (Tier A metrics only)
tools/generate.mjs       definitions -> dashboards (`--check` fails when JSON is stale)
tools/smoke-test.mjs     human-run: import into Grafana and run every query
tools/seed-metrics.mjs   SYNTHETIC data server for trying the dashboards without real telemetry
METRICS-PROPOSAL.md      upstream metric gaps
```

Edit a definition, then run `node observability/grafana/tools/generate.mjs`. `npm test` fails
if the committed JSON is stale.

## Prerequisites

### 1. Collector: convert delta to cumulative

gh-aw emits **delta** temporality. Without a delta-to-cumulative step before the Prometheus
exporter, `rate()` and `increase()` return wrong values (and the exporter may report
"Misaligned starting timestamps"). Minimal working collector config:

```yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }
processors:
  delta_to_cumulative:      # confirmed on otelcol-contrib v0.164.0; other builds may call it `deltatocumulative`
exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [delta_to_cumulative]
      exporters: [prometheus]
```

> Use the processor name your collector build accepts.

### 2. Metric name mapping

The Prometheus exporter turns dots into `_`, appends unit suffixes and `_total` for counters.
The dashboards use only these canonical series:

| OTEL metric | Prometheus series | Tier |
| --- | --- | --- |
| `gh_aw.job.duration` | `gh_aw_job_duration_seconds_{bucket,count,sum}` | A |
| `gh_aw.job.errors` | `gh_aw_job_errors_total` | A |
| `gh_aw.agent.turns` | `gh_aw_agent_turns_{bucket,count,sum}` | A |
| `gen_ai.invoke_agent.duration` | `gen_ai_invoke_agent_duration_seconds_{bucket,count,sum}` | A |
| `gh_aw.tool_calls` | `gh_aw_tool_calls_total` | A |
| `gh_aw.workflow.output_items` | `gh_aw_workflow_output_items_total` | A |
| input / output / cache tokens | `gen_ai_client_inference_usage_{input,output,cache_read_input,cache_write_input}_tokens_total` | A |
| `gh_aw.ai.credits.limit_exceeded`, `.rate_limit_errors` | `gh_aw_ai_credits_{limit_exceeded,rate_limit_errors}_total` | A |
| `gh_aw.otlp.export.failures` | `gh_aw_otlp_export_failures_total` | A |
| `gh_aw.ai.credits.usage` | `gh_aw_ai_credits_usage_total` | **B: not emitted yet** |

Your collector may also expose alias or compat series (`gh_aw_run_duration_seconds_*`,
`gh_aw_safe_outputs_total`, `gen_ai_client_token_usage_total`, `gh_aw_tokens_*_total`). The
dashboards never use them, because summing them double-counts. If your mapping differs, change
the one name map in `definitions/common.mjs` and regenerate.

Input tokens **include** cache tokens, so panels subtract cache to avoid double counting.

## Import

1. Create a Prometheus data source in Grafana.
2. Import each file in `dashboards/` (Dashboards > New > Import), or use the API
   (`tools/smoke-test.mjs` does this for you). Pick the Prometheus data source for `$ds`.
3. Set the dashboard variables:
   - `$gh_repo` (`owner/name`) powers the "open in GitHub Actions" links. Metrics carry no run
     ids, so links open the workflow's run list, not a single run.
   - `$price_in`, `$price_out`, `$price_cache_read`, `$price_cache_write` (USD per 1M tokens,
     default 0) drive the estimated-cost panels.
4. Optional: load `alerts/alerts.rules.yml` as a Prometheus rule file.

## Design rules

- At most 4 summary stats plus 2 main views per dashboard; detail sits in collapsed
  "Supplemental" rows. Tier B (spec-only) metrics sit in a collapsed row and have no alerts.
- Every panel's description states the question it answers, its metric tier and which
  variables it ignores.
- Missing is not zero: ratios use `a / (b > 0)`, so a quiet fleet shows "No data", not 0%.
- Totals use `$__range`, trends use `$__rate_interval`.

## Validating against a live Grafana and Prometheus

```
GRAFANA_URL=https://<host> GRAFANA_TOKEN=<service-account-token> PROM_DS_UID=<datasource-uid> \
  node observability/grafana/tools/smoke-test.mjs
```

It imports the dashboards into a "gh-aw (test)" folder, runs every panel and variable query
through `/api/ds/query`, and prints `OK`, `NO DATA` or `ERROR` per query (Tier B `NO DATA` is
expected), then checks which expected metric names exist in Prometheus. It exits non-zero on any
`ERROR`. Use `--no-import` to only run queries, `--folder "name"` to pick the folder.

To exercise the panels without real telemetry, run `tools/seed-metrics.mjs` and add a Prometheus
scrape job for `<host>:9101`. The data is synthetic.

The smoke test checks that queries run, not how panels look; check layout in the Grafana UI.
