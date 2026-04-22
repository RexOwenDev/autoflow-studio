import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { registerOTel } from "@vercel/otel";
import { selectExporterKind } from "@/lib/otel/exporter-factory";
import { buildSampler } from "@/lib/otel/sampling";

/**
 * Next.js instrumentation entry point (otel-nextjs pattern).
 * OTel failure is non-fatal — we log and continue serving.
 * Fixture adapters are NOT instrumented (they have no network latency to measure).
 */
export function register(): void {
  // Never instrument in fixture mode — no real spans to collect
  if (process.env.APP_MODE === "fixture") return;

  const kind = selectExporterKind(process.env.NODE_ENV);
  if (kind === "noop") return;

  try {
    if (kind === "console") {
      registerOTel({
        serviceName: process.env.OTEL_SERVICE_NAME ?? "autoflow-studio",
        traceExporter: new ConsoleSpanExporter(),
        traceSampler: buildSampler(process.env.NODE_ENV),
      });
      return;
    }

    registerOTel({
      serviceName: process.env.OTEL_SERVICE_NAME ?? "autoflow-studio",
      traceExporter: "auto",
      traceSampler: buildSampler(process.env.NODE_ENV),
    });
  } catch (_err) {}
}
