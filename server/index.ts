import "./load-env";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { upsertGoalserveMatches } from "./jobs/upsert-goalserve-matches";
import { isStagingHost } from "./middleware/environment";

const app = express();
app.set("etag", false);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const host = req.hostname || req.headers.host || "";
  if (isStagingHost(host)) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  next();
});

app.get("/robots.txt", (req, res) => {
  const host = req.hostname || req.headers.host || "";
  if (isStagingHost(host)) {
    res.type("text/plain").send("User-agent: *\nDisallow: /");
  } else {
    res.type("text/plain").send("User-agent: *\nAllow: /");
  }
});

const MAX_LOG_MSG_BYTES = 2048;

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const safe = message.length > MAX_LOG_MSG_BYTES
    ? message.slice(0, 120) + " [omitted: payload too large]"
    : message;

  console.log(`${formattedTime} [${source}] ${safe}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  let responseBytes = 0;

  const _write = res.write;
  const _end = res.end;

  function addBytes(chunk: unknown, encoding?: string) {
    if (chunk == null) return;
    if (Buffer.isBuffer(chunk)) {
      responseBytes += chunk.length;
    } else if (typeof chunk === "string") {
      responseBytes += Buffer.byteLength(chunk, encoding as BufferEncoding | undefined);
    }
  }

  res.write = function (this: Response, chunk: any, ...args: any[]) {
    addBytes(chunk, typeof args[0] === "string" ? args[0] : undefined);
    return (_write as Function).apply(this, [chunk, ...args]);
  } as typeof res.write;

  res.end = function (this: Response, chunk: any, ...args: any[]) {
    addBytes(chunk, typeof args[0] === "string" ? args[0] : undefined);
    return (_end as Function).apply(this, [chunk, ...args]);
  } as typeof res.end;

  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.originalUrl} ${res.statusCode} in ${duration}ms ${responseBytes}b`);
  });

  next();
});

(async () => {
  // Register /api/health first so it is never overridden by Vite/static/catch-all
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "football-mad",
      env: process.env.NODE_ENV || "development",
    });
  });

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = Number(process.env.PORT) || 5055;

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Express server running on port ${port}`);

    // Live polling for match updates
    if (process.env.ENABLE_LIVE_POLLING === "1") {
      log("[LivePolling] enabled");
      // Poll today's matches every 60 seconds
      setInterval(() => upsertGoalserveMatches("soccernew/home").catch(() => {}), 60_000);
      // Poll yesterday's matches every 10 minutes for late corrections
      setInterval(() => upsertGoalserveMatches("soccernew/d-1").catch(() => {}), 600_000);
    }
  });
})();
