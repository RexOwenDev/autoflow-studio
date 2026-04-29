import { Inngest } from "inngest";

const eventKey = process.env.INNGEST_EVENT_KEY;

export const inngest = new Inngest(
  eventKey ? { id: "autoflow-studio", eventKey } : { id: "autoflow-studio" },
);
