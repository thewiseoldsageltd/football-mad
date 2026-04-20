import "dotenv/config";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pool } from "../server/db";
import { ingestEntityMediaFromBuffer } from "../server/lib/entity-media-service";

type CompetitionRow = {
  id: string;
  name: string;
  slug: string;
};

type CliArgs = {
  competitionId: string;
  svgPath: string;
  sourceRef: string;
  force: boolean;
};

function readArg(argv: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const hit = argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : null;
}

function parseArgs(argv: string[]): CliArgs {
  const competitionId = readArg(argv, "competitionId") ?? "ca36e169-09bf-4db0-942c-54ceb529f870";
  const svgPath = readArg(argv, "svgPath") ?? "fifa-world-cup-2026.svg";
  const sourceRef = readArg(argv, "sourceRef") ?? "manual:fifa-world-cup-logo:2026-svg";
  const force = argv.includes("--force");

  return { competitionId, svgPath, sourceRef, force };
}

async function main(): Promise<void> {
  const { competitionId, svgPath, sourceRef, force } = parseArgs(process.argv.slice(2));
  const resolvedSvgPath = path.resolve(process.cwd(), svgPath);
  const storageVersion = `${Date.now()}`;

  try {
    const compRes = await pool.query<CompetitionRow>(
      `SELECT id, name, slug FROM competitions WHERE id = $1 LIMIT 1`,
      [competitionId],
    );
    const competition = compRes.rows[0];
    if (!competition) {
      throw new Error(`Competition not found for id='${competitionId}'`);
    }

    const svgBuffer = await readFile(resolvedSvgPath);
    const ingest = await ingestEntityMediaFromBuffer({
      entityType: "competition",
      entityId: competition.id,
      mediaRole: "logo",
      sourceSystem: "manual",
      sourceRef,
      sourceFormatHint: "svg",
      sourceMimeTypeHint: "image/svg+xml",
      makePrimary: true,
      storageVersion,
      forceReingest: force,
      originalBuffer: svgBuffer,
    });

    if (!ingest.ok) {
      throw new Error(ingest.error ?? "Unknown ingest failure");
    }

    const verifyRes = await pool.query(
      `SELECT id, entity_type, entity_id, media_role, source_system, is_primary, status, cdn_original_url
       FROM entity_media
       WHERE entity_type = 'competition'
         AND entity_id = $1
         AND media_role = 'logo'
         AND is_primary = true
         AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [competition.id],
    );

    const verify = verifyRes.rows[0] ?? null;
    console.log("[competition-logo-import] done", {
      competitionId: competition.id,
      competitionName: competition.name,
      competitionSlug: competition.slug,
      svgPath: resolvedSvgPath,
      force,
      unchanged: Boolean(ingest.unchanged),
      cdnOriginalUrl: ingest.cdnOriginalUrl ?? null,
      verifiedPrimaryActiveLogo: verify,
    });
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[competition-logo-import] failed", error);
  process.exitCode = 1;
});
