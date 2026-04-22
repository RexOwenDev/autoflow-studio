import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  ParentBasedSampler,
  type Sampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";

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
