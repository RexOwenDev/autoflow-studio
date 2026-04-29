import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { registerOTel } from "@vercel/otel";
import { selectExporterKind } from "@/lib/otel/exporter-factory";
import { buildSampler } from "@/lib/otel/sampling";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
  }

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

export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(...args);
  }
}
