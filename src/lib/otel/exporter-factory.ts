export type ExporterKind = "otlp" | "console" | "noop";

export function selectExporterKind(nodeEnv: string | undefined): ExporterKind {
  switch (nodeEnv) {
    case "production":
      return "otlp";
    case "test":
      return "noop";
    default:
      return "console";
  }
}
