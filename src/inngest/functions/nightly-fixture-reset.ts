/* biome-ignore-all lint/suspicious/noConsole: Inngest function logs to platform stdout. */
import { inngest } from "../client";

const FIXTURE_RESET_SEED = 0x5eed_de_30;

export const nightlyFixtureReset = inngest.createFunction(
  {
    id: "nightly-fixture-reset",
    name: "Nightly fixture reset (autoflow-studio)",
    triggers: [{ cron: "0 3 * * *" }],
  },
  async ({ step }) => {
    if (process.env.APP_MODE !== "fixture") {
      console.info("APP_MODE is not 'fixture' — skipping nightly reset.");
      return { skipped: true, reason: "live-mode" };
    }

    await step.run("reseed-executions", async () => {
      console.info("Reseeding execution fixtures with deterministic PRNG.");
      return { seed: FIXTURE_RESET_SEED, count: 100 };
    });

    await step.run("reseed-billing", async () => {
      console.info("Reseeding billing fixtures.");
      return { seeded: true };
    });

    await step.run("reseed-templates", async () => {
      console.info("Reseeding template fixtures.");
      return { seeded: true };
    });

    return { reset_at: new Date().toISOString(), seed: FIXTURE_RESET_SEED };
  },
);
