import { gunzipSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";
import { jobFetch } from "../../lib/job-observability";

const GOALSERVE_BASE_URL = "https://www.goalserve.com/getfeed/";

const DEFAULT_HEADERS = {
  "Accept-Encoding": "identity",
  "User-Agent": "FootballMad/1.0",
} as const;

export async function goalserveFetch(path: string, runId?: string): Promise<any> {
  const feedKey = process.env.GOALSERVE_FEED_KEY;

  if (!feedKey) {
    throw new Error("GOALSERVE_FEED_KEY is not configured");
  }

  const jsonParam = path.includes("?") ? "&json=1" : "?json=1";
  const finalUrl = `${GOALSERVE_BASE_URL}${feedKey}/${path}${jsonParam}`;
  const redactedUrl = finalUrl.replace(feedKey, "***");

  console.log(`[Goalserve] Fetching: ${redactedUrl}`);

  const response = await jobFetch(runId ?? "", {
    provider: "goalserve",
    url: finalUrl,
    method: "GET",
    fetcher: () => fetch(finalUrl, { headers: DEFAULT_HEADERS }),
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

/**
 * Fetch XML from Goalserve (no ?json=1 param).
 * Used to get proper <week number="X"> containers for league fixtures.
 */
export async function goalserveFetchXml(path: string, runId?: string): Promise<any> {
  const feedKey = process.env.GOALSERVE_FEED_KEY;

  if (!feedKey) {
    throw new Error("GOALSERVE_FEED_KEY is not configured");
  }

  const finalUrl = `${GOALSERVE_BASE_URL}${feedKey}/${path}`;
  const redactedUrl = finalUrl.replace(feedKey, "***");

  console.log(`[Goalserve XML] Fetching: ${redactedUrl}`);

  const response = await jobFetch(runId ?? "", {
    provider: "goalserve",
    url: finalUrl,
    method: "GET",
    fetcher: () => fetch(finalUrl, { headers: DEFAULT_HEADERS }),
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
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: true,
  });
  
  return parser.parse(decodedText);
}
