# gh-aw Grafana dashboards

Dashboards, alert rules, and specs for the OTLP metrics emitted by gh-aw
([github/gh-aw#78433](https://github.com/github/gh-aw/pull/78433)).

| Path | Contents |
| --- | --- |
| `grafana/*.json` | Importable dashboards (Grafana 10+, Prometheus data source) |
| `grafana/definitions.mjs`, `lib.mjs`, `build.mjs` | Source the JSON is generated from |
| `grafana/dashboards.test.mjs` | Checks queries against the real metric and label names |
| `prometheus/alerts.rules.yml` | Alert rules matching the thresholds in [SPECS.md](./SPECS.md) |
| [SPECS.md](./SPECS.md) | Purpose, panels, queries, visualizations, and thresholds per dashboard |
| [METRICS-PROPOSAL.md](./METRICS-PROPOSAL.md) | Gaps found and new upstream metrics proposed |

## Dashboards

| File | Audience | Questions answered |
| --- | --- | --- |
| `operations-overview.json` | On-call, maintainers | Are workflows healthy? How long do they take? How much do they produce? |
| `agent-performance.json` | Workflow authors | How many tokens, turns, and tool calls do agents use? Which models? Do tools fail? |
| `cost-efficiency.json` | Budget owners | What does it cost (estimate)? Which workflows spend without producing output? |
| `reliability.json` | On-call, SRE | What fails, where, and why? Are limits or telemetry export hurting us? |

## Prerequisites

1. **Enable metrics.** They are on by default when OTLP is configured. Do not set `GH_AW_OTEL_METRICS: "false"`.
2. **Delta to cumulative.** gh-aw exports counters and histograms with *delta* temporality. Prometheus expects cumulative. Route metrics through an OpenTelemetry Collector with the [`deltatocumulative` processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/deltatocumulativeprocessor), then export to Prometheus (remote write or the Prometheus OTLP receiver):

   ```yaml
   processors:
     deltatocumulative: {}
   service:
     pipelines:
       metrics:
         receivers: [otlp]
         processors: [deltatocumulative]
         exporters: [prometheusremotewrite]
   ```

   Without this step, `increase()` panels under-report or stay empty. Grafana Cloud and Mimir accept OTLP and apply equivalent conversion.
3. **Name translation.** The queries assume the standard Prometheus OTLP translation: dots become underscores, unit `s` adds `_seconds`, monotonic counters add `_total`, and `{...}` annotation units are dropped. Examples: `gh_aw.job.duration` becomes `gh_aw_job_duration_seconds_*`, `gh-aw.workflow.name` becomes `gh_aw_workflow_name`. If your pipeline keeps dots (UTF-8 mode in Prometheus 3), edit the `M` and `F` tables in `grafana/lib.mjs` and rebuild.

## Import

Grafana UI: Dashboards, New, Import, upload the JSON, pick your Prometheus data source.

Provisioning: copy `grafana/*.json` into a provisioned dashboards folder.

Alerts: add `prometheus/alerts.rules.yml` to `rule_files`, or load it into Mimir or Grafana-managed rules.

## Modifying dashboards

Edit `grafana/definitions.mjs`, then:

```bash
cd contrib/gh-aw/dashboards/grafana
node build.mjs              # regenerate JSON
node --test dashboards.test.mjs
```

The test fails if committed JSON is stale, a query uses an unknown metric or label, a histogram is queried without `_bucket`/`_sum`/`_count`, or a canonical metric is mixed with a `gh_aw.run.*` alias.

## Known limits

- **Cost is an estimate.** gh-aw exports tokens and no price. The Cost dashboard multiplies by price variables you set. `gh-aw.aic` (AI credits) is only a span attribute today; see METRICS-PROPOSAL.md.
- **Job, not run.** `gh_aw.job.*` counts every job (activation, agent, detection, safe_outputs, conclusion). Use `gh_aw_job_name="agent"` for workflow executions.
- **Coarse buckets.** Histogram buckets are fixed at 1 s to 1 h, so percentiles are interpolated.
- **No errors by cause.** Job errors carry only `failure`, `timed_out`, or `cancelled`. Retries, firewall blocks, and per-tool breakdowns are not metrics yet.
- **Label coverage.** `gen_ai_request_model` and `gh_aw_engine_id` exist only on duration and token series.
- **Export failures.** `gh_aw_otlp_export_failures_total` is delivered only to collectors that accepted another batch. A fully unreachable collector shows as a silent gap, so alert on absent data too.
