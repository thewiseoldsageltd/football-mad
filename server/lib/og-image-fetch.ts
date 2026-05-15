const FETCH_TIMEOUT_MS = 15_000;

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "image/*",
        "User-Agent": "FootballMad-OG-Image/1.0",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`fetch failed: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}
