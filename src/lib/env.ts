/**
 * Boot-time environment validation.
 *
 * Gemini Phase 0 audit (HIGH): APP_MODE must be explicit in non-development
 * environments. If undefined in production, we fail fast rather than silently
 * falling back to fixture mode (which would mock auth and payments in prod).
 */

const VALID_APP_MODES = ["fixture", "live"] as const;
export type AppMode = (typeof VALID_APP_MODES)[number];

function resolveAppMode(): AppMode {
  const raw = process.env.APP_MODE;

  if (raw === undefined || raw === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[AutoFlow] APP_MODE is not set. " +
          "Production requires an explicit APP_MODE=live or APP_MODE=fixture. " +
          "Refusing to start — preventing silent fixture-mode boot in production.",
      );
    }
    // Development: default to fixture for zero-config DX
    return "fixture";
  }

  if (!(VALID_APP_MODES as readonly string[]).includes(raw)) {
    throw new Error(
      `[AutoFlow] Invalid APP_MODE="${raw}". Must be one of: ${VALID_APP_MODES.join(", ")}.`,
    );
  }

  return raw as AppMode;
}

export const APP_MODE: AppMode = resolveAppMode();
export const IS_FIXTURE_MODE = APP_MODE === "fixture";
export const IS_LIVE_MODE = APP_MODE === "live";
