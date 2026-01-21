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
  
  if (response.status !== 200) {
    throw new Error(`Goalserve API returned status ${response.status}`);
  }
  
  return response.json();
}
