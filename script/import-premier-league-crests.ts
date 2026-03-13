import "dotenv/config";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { pool } from "../server/db";
import { ingestEntityMediaFromBuffer } from "../server/lib/entity-media-service";

type TeamRow = { id: string };

type Summary = {
  scanned: number;
  matchedTeams: number;
  uploaded: number;
  skipped: number;
  unchanged: number;
  failed: number;
};

function parseArgs(argv: string[]): { dir: string } {
  const dirFlag = argv.find((arg) => arg.startsWith("--dir="));
  const dir = dirFlag ? dirFlag.slice("--dir=".length) : "crest-pack/premier-league";
  return { dir };
}

async function main(): Promise<void> {
  const { dir } = parseArgs(process.argv.slice(2));
  const crestDir = path.resolve(process.cwd(), dir);
  const importVersion = `${Date.now()}`;

  const summary: Summary = {
    scanned: 0,
    matchedTeams: 0,
    uploaded: 0,
    skipped: 0,
    unchanged: 0,
    failed: 0,
  };

  try {
    const entries = await readdir(crestDir, { withFileTypes: true });
    const svgFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".svg"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    summary.scanned = svgFiles.length;

    for (const fileName of svgFiles) {
      const slug = fileName.replace(/\.svg$/i, "");
      const filePath = path.join(crestDir, fileName);

      const teamRes = await pool.query<TeamRow>(
        `SELECT id FROM teams WHERE slug = $1 LIMIT 1`,
        [slug],
      );

      const team = teamRes.rows[0];
      if (!team) {
        summary.skipped += 1;
        console.log(`[skip] no team found for slug='${slug}' file='${fileName}'`);
        continue;
      }

      summary.matchedTeams += 1;

      const svgBuffer = await readFile(filePath);
      const ingest = await ingestEntityMediaFromBuffer({
        entityType: "team",
        entityId: team.id,
        mediaRole: "crest",
        sourceSystem: "manual",
        sourceRef: `manual:premier-league-crest-import:${fileName}`,
        sourceFormatHint: "svg",
        sourceMimeTypeHint: "image/svg+xml",
        makePrimary: true,
        storageVersion: importVersion,
        originalBuffer: svgBuffer,
      });

      if (!ingest.ok) {
        summary.failed += 1;
        summary.skipped += 1;
        console.error(`[failed] slug='${slug}' teamId='${team.id}' file='${fileName}' error='${ingest.error ?? "unknown"}'`);
        continue;
      }

      if (ingest.unchanged) {
        summary.unchanged += 1;
        summary.skipped += 1;
        console.log(`[unchanged] slug='${slug}' teamId='${team.id}' file='${fileName}'`);
        continue;
      }

      summary.uploaded += 1;
      console.log(
        `[uploaded] slug='${slug}' teamId='${team.id}' file='${fileName}' url='${ingest.cdnOriginalUrl ?? ""}'`,
      );
    }

    console.log("");
    console.log("Premier League crest import summary");
    console.log(`version: v${importVersion}`);
    console.log(`scanned: ${summary.scanned}`);
    console.log(`matched teams: ${summary.matchedTeams}`);
    console.log(`uploaded: ${summary.uploaded}`);
    console.log(`skipped: ${summary.skipped}`);
    console.log(`unchanged: ${summary.unchanged}`);
    console.log(`failed: ${summary.failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[import-premier-league-crests] failed:", err);
  process.exitCode = 1;
});
