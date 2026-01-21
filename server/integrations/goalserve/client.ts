import { gunzipSync } from "node:zlib";

const GOALSERVE_BASE_URL = "https://www.goalserve.com/getfeed/";

export async function goalserveFetch(feedPath: string): Promise<any> {
  const feedKey = process.env.GOALSERVE_FEED_KEY;
  
  if (!feedKey) {
    throw new Error("GOALSERVE_FEED_KEY is not configured");
  }
  
  const jsonParam = feedPath.includes("?") ? "&json=1" : "?json=1";
  const url = `${GOALSERVE_BASE_URL}${feedKey}/${feedPath}${jsonParam}`;
  const redactedUrl = url.replace(feedKey, "***");
  
  console.log(`[Goalserve] Fetching: ${redactedUrl}`);
  
  const response = await fetch(url, {
    headers: {
      "Accept-Encoding": "identity",
      "User-Agent": "FootballMad/1.0",
    },
  });
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  let decodedText: string;
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const decompressed = gunzipSync(Buffer.from(buffer));
    decodedText = decompressed.toString("utf-8");
  } else {
    decodedText = new TextDecoder("utf-8").decode(bytes);
  }
  
  if (response.status !== 200) {
    throw new Error(`Goalserve API returned status ${response.status}. Body: ${decodedText.slice(0, 300).trim()}`);
  }
  
  try {
    return JSON.parse(decodedText);
  } catch {
    throw new Error("Goalserve returned non-JSON or invalid JSON. First 300 chars: " + decodedText.slice(0, 300));
  }
}
