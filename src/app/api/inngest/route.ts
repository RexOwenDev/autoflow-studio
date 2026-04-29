import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { nightlyFixtureReset } from "@/inngest/functions/nightly-fixture-reset";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [nightlyFixtureReset],
});
