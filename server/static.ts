import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { shouldBlockSearchIndexing } from "./middleware/environment";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  let indexTemplate: string | null = null;

  function sendSpaIndex(req: Request, res: Response) {
    const hostHeader = req.headers.host || "";
    const host = req.hostname || hostHeader.split(":")[0] || "";
    const block = shouldBlockSearchIndexing(host);

    if (!indexTemplate) {
      indexTemplate = fs.readFileSync(indexPath, "utf8");
    }

    let html = indexTemplate;
    const robotsMeta = block
      ? '<meta name="robots" content="noindex,nofollow,noarchive" />'
      : '<meta name="robots" content="index,follow" />';

    if (/<meta\s+name="robots"\s/i.test(html)) {
      html = html.replace(/<meta\s+name="robots"\s[^>]*>/i, robotsMeta);
    } else {
      html = html.replace("<head>", `<head>\n    ${robotsMeta}`);
    }

    res.type("html").send(html);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    sendSpaIndex(req, res);
  });
}
