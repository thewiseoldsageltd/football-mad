const GOALSERVE_BASE_URL = "https://www.goalserve.com/getfeed/";

export async function goalserveFetch(feedPath: string): Promise<any> {
  const feedKey = process.env.GOALSERVE_FEED_KEY;
  
  if (!feedKey) {
    throw new Error("GOALSERVE_FEED_KEY is not configured");
  }
  
  const url = `${GOALSERVE_BASE_URL}${feedKey}/soccer/${feedPath}?json=1`;
  const redactedUrl = url.replace(feedKey, "***");
  
  console.log(`[Goalserve] Fetching: ${redactedUrl}`);
  
  const response = await fetch(url);
  const text = await response.text();
  
  if (response.status !== 200) {
    throw new Error(`Goalserve API returned status ${response.status}. Body: ${text.slice(0, 300).trim()}`);
  }
  
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Goalserve returned non-JSON or invalid JSON. First 300 chars: " + text.slice(0, 300));
  }
}
