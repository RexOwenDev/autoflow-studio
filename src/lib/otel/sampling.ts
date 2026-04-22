import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  ParentBasedSampler,
  type Sampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";

/**
 * Sampling strategy per environment:
 *   production → parent-based 10% — balances cost and incident signal. Parent-based
 *                lets upstream decisions (e.g. from a paged user request) flow through,
 *                so we capture correlated traces for the 10% we sampled start-to-finish.
 *   test       → sample nothing; tests must not emit real telemetry.
 *   development → sample everything so the developer sees every span locally.
 *
 * Phase 8 dashboards pull from whatever OTLP sink is configured; the sampler runs
 * before export so we only pay for 10% of production traffic by default.
 */
export function buildSampler(nodeEnv: string | undefined): Sampler {
  switch (nodeEnv) {
    case "production":
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(0.1),
      });
    case "test":
      return new AlwaysOffSampler();
    default:
      return new AlwaysOnSampler();
  }
}
