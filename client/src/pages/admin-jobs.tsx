import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNowStrict } from "date-fns";

type JobRun = {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  counters?: Record<string, unknown> | null;
  error?: string | null;
  stopped_reason?: string | null;
  meta?: Record<string, unknown> | null;
};

type JobHttpCall = {
  id: string;
  provider: string;
  url: string;
  method: string;
  statusCode: number | null;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
};

type RunsResponse = { runs: JobRun[] };
type RunDetailResponse = { run: JobRun; httpCalls: JobHttpCall[] };

type PamediaStatus = {
  enabled: boolean;
  intervalMs: number;
  isRunning: boolean;
  lastRunAt: string | null;
  lastError: string | null;
};

type EntityBackfillStatus = {
  ok: boolean;
  status: {
    tags: { status: string; lastRunAt: string | null };
    deterministic: { status: string; lastRunAt: string | null };
  };
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function durationMs(startedAt: string, finishedAt: string | null): number | null {
  if (!finishedAt) return null;
  const s = new Date(startedAt).getTime();
  const f = new Date(finishedAt).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(f) || f < s) return null;
  return f - s;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "Running";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

function staleTone(lastAt: string | null | undefined, failed = false): "green" | "amber" | "red" {
  if (failed) return "red";
  if (!lastAt) return "red";
  const ageMs = Date.now() - new Date(lastAt).getTime();
  if (ageMs < 24 * 60 * 60 * 1000) return "green";
  if (ageMs <= 48 * 60 * 60 * 1000) return "amber";
  return "red";
}

function toneClasses(tone: "green" | "amber" | "red"): string {
  if (tone === "green") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (tone === "amber") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

async function fetchWithSecret<T>(url: string, secret?: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: secret ? { "x-sync-secret": secret } : {},
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body || "Request failed"}`);
  }
  return (await res.json()) as T;
}

export default function AdminJobsPage() {
  const [jobSecret, setJobSecret] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ["/api/jobs/runs", jobSecret],
    enabled: jobSecret.trim().length > 0,
    queryFn: () => fetchWithSecret<RunsResponse>("/api/jobs/runs?limit=50", jobSecret.trim()),
    staleTime: 30_000,
  });

  const pamediaQuery = useQuery({
    queryKey: ["/api/jobs/pamedia/status"],
    queryFn: () => fetchWithSecret<PamediaStatus>("/api/jobs/pamedia/status"),
    staleTime: 30_000,
  });

  const backfillQuery = useQuery({
    queryKey: ["/api/jobs/entity-backfill/status", jobSecret],
    enabled: jobSecret.trim().length > 0,
    queryFn: () => fetchWithSecret<EntityBackfillStatus>("/api/jobs/entity-backfill/status", jobSecret.trim()),
    staleTime: 30_000,
  });

  const runDetailQuery = useQuery({
    queryKey: ["/api/jobs/runs/:id", selectedRunId, jobSecret],
    enabled: Boolean(selectedRunId && jobSecret.trim()),
    queryFn: () => fetchWithSecret<RunDetailResponse>(`/api/jobs/runs/${selectedRunId}`, jobSecret.trim()),
    staleTime: 30_000,
  });

  const runs = runsQuery.data?.runs ?? [];

  const squadsRun = useMemo(
    () => runs.find((r) => r.status === "success" && /squad/i.test(r.job_name)),
    [runs],
  );
  const managersRun = useMemo(
    () => runs.find((r) => r.status === "success" && /manager/i.test(r.job_name)),
    [runs],
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold">Jobs Dashboard</h1>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="GOALSERVE/PAMEDIA secret"
              value={jobSecret}
              onChange={(e) => setJobSecret(e.target.value)}
              className="w-[280px]"
            />
            <Button onClick={() => runsQuery.refetch()}>Refresh</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">PA Media Status</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Enabled: {pamediaQuery.data?.enabled ? "Yes" : "No"}</div>
              <div>Running: {pamediaQuery.data?.isRunning ? "Yes" : "No"}</div>
              <div>Last Run: {formatDateTime(pamediaQuery.data?.lastRunAt)}</div>
              <Badge className={toneClasses(staleTone(pamediaQuery.data?.lastRunAt, Boolean(pamediaQuery.data?.lastError)))}>
                {pamediaQuery.data?.lastRunAt ? formatDistanceToNowStrict(new Date(pamediaQuery.data.lastRunAt), { addSuffix: true }) : "stale"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Entity Backfill Status</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Tags: {backfillQuery.data?.status?.tags?.status ?? "Unavailable"}</div>
              <div>Deterministic: {backfillQuery.data?.status?.deterministic?.status ?? "Unavailable"}</div>
              <div>Last Run: {formatDateTime(backfillQuery.data?.status?.deterministic?.lastRunAt ?? backfillQuery.data?.status?.tags?.lastRunAt)}</div>
              <Badge className={toneClasses(staleTone(backfillQuery.data?.status?.deterministic?.lastRunAt ?? backfillQuery.data?.status?.tags?.lastRunAt, backfillQuery.isError))}>
                {backfillQuery.isError ? "failed" : "status"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Last Successful Squads Run</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>{squadsRun?.job_name ?? "No successful squads run found"}</div>
              <div>{formatDateTime(squadsRun?.started_at)}</div>
              <Badge className={toneClasses(staleTone(squadsRun?.started_at))}>
                {squadsRun?.started_at ? formatDistanceToNowStrict(new Date(squadsRun.started_at), { addSuffix: true }) : "stale"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Last Successful Managers Run</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>{managersRun?.job_name ?? "No successful managers run found"}</div>
              <div>{formatDateTime(managersRun?.started_at)}</div>
              <Badge className={toneClasses(staleTone(managersRun?.started_at))}>
                {managersRun?.started_at ? formatDistanceToNowStrict(new Date(managersRun.started_at), { addSuffix: true }) : "stale"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runsQuery.isError ? (
              <div className="text-sm text-red-600">{(runsQuery.error as Error).message}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Finished</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow
                      key={run.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      <TableCell className="font-medium">{run.job_name}</TableCell>
                      <TableCell>
                        <Badge className={toneClasses(staleTone(run.started_at, run.status === "error"))}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(run.started_at)}</TableCell>
                      <TableCell>{formatDateTime(run.finished_at)}</TableCell>
                      <TableCell>{formatDuration(durationMs(run.started_at, run.finished_at))}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{run.error ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedRunId ? (
              <div className="text-sm text-muted-foreground">Select a run row to inspect metadata and HTTP calls.</div>
            ) : runDetailQuery.isError ? (
              <div className="text-sm text-red-600">{(runDetailQuery.error as Error).message}</div>
            ) : !runDetailQuery.data ? (
              <div className="text-sm text-muted-foreground">Loading run details...</div>
            ) : (
              <>
                <div className="text-sm">
                  <div><strong>Job:</strong> {runDetailQuery.data.run.job_name}</div>
                  <div><strong>Status:</strong> {runDetailQuery.data.run.status}</div>
                  <div><strong>Started:</strong> {formatDateTime(runDetailQuery.data.run.started_at)}</div>
                  <div><strong>Finished:</strong> {formatDateTime(runDetailQuery.data.run.finished_at)}</div>
                  <div><strong>Error:</strong> {runDetailQuery.data.run.error ?? "—"}</div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runDetailQuery.data.httpCalls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>{call.provider}</TableCell>
                        <TableCell>{call.method}</TableCell>
                        <TableCell>{call.statusCode ?? "—"}</TableCell>
                        <TableCell>{call.durationMs != null ? `${call.durationMs}ms` : "—"}</TableCell>
                        <TableCell className="max-w-[500px] truncate">{call.url}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
