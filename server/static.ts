import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { prepareSpaIndexHtml } from "./lib/spa-html";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  let indexTemplate: string | null = null;

  async function sendSpaIndex(req: Request, res: Response) {
    if (!indexTemplate) {
      indexTemplate = fs.readFileSync(indexPath, "utf8");
    }

    try {
      const html = await prepareSpaIndexHtml(req, indexTemplate);
      res.type("html").send(html);
    } catch (err) {
      console.error("[spa-html] metadata injection failed", err);
      res.type("html").send(indexTemplate);
    }
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    void sendSpaIndex(req, res);
  });
}
