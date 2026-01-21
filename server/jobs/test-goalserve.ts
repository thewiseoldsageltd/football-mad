import { goalserveFetch } from "../integrations/goalserve/client";

export async function testGoalserveConnection(): Promise<{
  ok: boolean;
  feed?: string;
  receivedAt?: string;
  topLevelKeys?: string[];
  error?: string;
}> {
  try {
    const response = await goalserveFetch("scores");
    
    return {
      ok: true,
      feed: "soccer/scores",
      receivedAt: new Date().toISOString(),
      topLevelKeys: Object.keys(response),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error,
    };
  }
}
