import type { Request, Response, NextFunction } from "express";

export function requireJobSecret(expectedEnvKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const expectedSecret = process.env[expectedEnvKey];

    if (!expectedSecret) {
      return res.status(500).json({ error: "Sync not configured" });
    }

    const headerSecret = req.headers["x-sync-secret"] as string | undefined;
    const authHeader = req.headers["authorization"] as string | undefined;

    let providedSecret: string | undefined;

    if (headerSecret) {
      providedSecret = headerSecret;
    } else if (authHeader?.startsWith("Bearer ")) {
      providedSecret = authHeader.slice(7);
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    next();
  };
}
