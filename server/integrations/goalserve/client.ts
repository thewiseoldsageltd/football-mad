import { gunzipSync } from "node:zlib";

const GOALSERVE_BASE_URL = "https://www.goalserve.com/getfeed/";

export async function goalserveFetch(feedPath: string): Promise<any> {
  const feedKey = process.env.GOALSERVE_FEED_KEY;

  if (!feedKey) {
    throw new Error("GOALSERVE_FEED_KEY is not configured");
  }

  let cleanPath = String(feedPath ?? "")
    .trim()
    .replace(/^\//, "")
    .replace(/[?&]json=1\b/g, "");

  // Never allow double "soccernew/" prefix
  while (cleanPath.startsWith("soccernew/soccernew/")) {
    cleanPath = cleanPath.replace("soccernew/soccernew/", "soccernew/");
  } 

  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const url = new URL(`${GOALSERVE_BASE_URL}${feedKey}/${cleanPath}`);
    console.log("[goalserveFetch] feedPath =", feedPath);
    console.log("[goalserveFetch] cleanPath =", cleanPath);
    console.log("[goalserveFetch] url =", url.toString().replace(feedKey, "***"));
    url.searchParams.set("json", "1");
    url.searchParams.set("t", String(Date.now())); // cache-bust

    const redactedUrl = url.toString().replace(feedKey, "***");
    console.log(`[Goalserve] Fetching (${attempt}/${maxAttempts}): ${redactedUrl}`);

    const response = await fetch(url.toString(), {
      headers: {
        "Accept-Encoding": "identity",
        "User-Agent": "FootballMad/1.0",
      },
    });

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let decodedText: string;
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      decodedText = gunzipSync(Buffer.from(buffer)).toString("utf-8");
    } else {
      decodedText = new TextDecoder("utf-8").decode(bytes);
    }

    if (response.status === 200) {
      try {
        return JSON.parse(decodedText);
      } catch {
        throw new Error(
          "Goalserve returned invalid JSON. First 300 chars: " +
            decodedText.slice(0, 300)
        );
      }
    }

    if (response.status >= 500 && attempt < maxAttempts) {
      console.warn(
        `[Goalserve] ${response.status} – retrying (${attempt}/${maxAttempts})`
      );
      await new Promise((r) => setTimeout(r, 400 * attempt));
      continue;
    }

    throw new Error(
      `Goalserve API returned status ${response.status}. Body: ${decodedText
        .slice(0, 300)
        .trim()}`
    );
  }

  throw new Error("Goalserve fetch failed after all retries");
} 