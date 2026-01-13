"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReconstructResult } from "@/components/reconstruct/reconstruct-result";
import {
  fetchTrip,
  reconstructTripInTrip,
  renameTrip,
  type ReconstructDay,
  type ReconstructItineraryItem,
  type TripItem,
  type TripRun,
} from "@/lib/api-client";

function getClientTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDayLabel(dateValue: string) {
  const parsed = parseIsoDate(dateValue);
  if (!parsed) return dateValue;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function buildDateKey(item: TripItem) {
  if (item.startLocalDate) return item.startLocalDate;
  if (item.startIso) return item.startIso.slice(0, 10);
  return "Unscheduled";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractAiDetails(
  item: TripItem
): Partial<
  Pick<ReconstructItineraryItem, "flight" | "lodging" | "meeting" | "meal">
> | null {
  if (!item.metadata || !isRecord(item.metadata)) return null;
  const ai = isRecord(item.metadata.ai) ? item.metadata.ai : null;
  if (!ai || !isRecord(ai)) return null;

  const details: Record<string, unknown> = {};
  if (isRecord(ai.flight)) details.flight = ai.flight;
  if (isRecord(ai.lodging)) details.lodging = ai.lodging;
  if (isRecord(ai.meeting)) details.meeting = ai.meeting;
  if (isRecord(ai.meal)) details.meal = ai.meal;

  return Object.keys(details).length ? details : null;
}

function sortTripItems(a: TripItem, b: TripItem) {
  const aIso = a.startIso ? Date.parse(a.startIso) : Number.POSITIVE_INFINITY;
  const bIso = b.startIso ? Date.parse(b.startIso) : Number.POSITIVE_INFINITY;
  if (aIso !== bIso) return aIso - bIso;
  const aTime = a.startLocalTime ?? "";
  const bTime = b.startLocalTime ?? "";
  if (aTime !== bTime) return aTime.localeCompare(bTime);
  return a.title.localeCompare(b.title);
}

function mapTripItemsToDays(items: TripItem[]): ReconstructDay[] {
  const visibleItems = items.filter((item) => item.state !== "DISMISSED");
  const byDay = new Map<string, TripItem[]>();

  visibleItems.forEach((item) => {
    const key = buildDateKey(item);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  });

  const sortedKeys = Array.from(byDay.keys()).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return a.localeCompare(b);
  });

  return sortedKeys.map((key, index) => {
    const itemsForDay = (byDay.get(key) ?? []).sort(sortTripItems);
    return {
      dayIndex: index + 1,
      label: key === "Unscheduled" ? "Unscheduled" : formatDayLabel(key),
      localDate: key === "Unscheduled" ? null : key,
      items: itemsForDay.map((item) => {
        const aiDetails = extractAiDetails(item);
        return {
          id: item.fingerprint || item.id,
          kind: item.kind,
          title: item.title,
          start: {
            localDate: item.startLocalDate,
            localTime: item.startLocalTime,
            timezone: item.startTimezone ?? item.timezone,
            iso: item.startIso,
          },
          end: {
            localDate: item.endLocalDate,
            localTime: item.endLocalTime,
            timezone: item.endTimezone ?? item.timezone,
            iso: item.endIso,
          },
          locationText: item.locationText,
          isInferred: item.isInferred,
          confidence: item.confidence,
          sourceSnippet: item.sourceSnippet,
          flight: aiDetails?.flight ?? null,
          lodging: aiDetails?.lodging ?? null,
          meeting: aiDetails?.meeting ?? null,
          meal: aiDetails?.meal ?? null,
        };
      }),
    };
  });
}

export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;
  const tz = useMemo(() => getClientTimezone(), []);

  const [appendText, setAppendText] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const tripQuery = useQuery({
    queryKey: ["trips", tripId],
    queryFn: () => fetchTrip(tripId),
  });

  const reconstructMutation = useMutation({
    mutationFn: (payload: { rawText: string }) =>
      reconstructTripInTrip(tripId, {
        rawText: payload.rawText,
        client: {
          timezone: tz,
          nowIso: new Date().toISOString(),
        },
      }),
    onSuccess: () => {
      setAppendText("");
      tripQuery.refetch();
    },
  });

  const renameMutation = useMutation({
    mutationFn: (title: string) => renameTrip(tripId, title),
    onSuccess: (response) => {
      tripQuery.refetch();
      setIsEditingTitle(false);
      setTitleDraft(response.trip.title);
    },
  });

  const onSubmitAppend = async () => {
    const text = appendText.trim();
    if (!text || reconstructMutation.isPending) return;
    await reconstructMutation.mutateAsync({ rawText: text });
  };

  const trip = tripQuery.data?.trip;
  const latestOutput = tripQuery.data?.latestRun?.outputJson ?? null;
  const tripItems = tripQuery.data?.tripItems ?? [];
  const itineraryOverride = tripItems.length
    ? mapTripItemsToDays(tripItems)
    : undefined;

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              {isEditingTitle ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    className="max-w-md"
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      renameMutation.mutate(titleDraft.trim() || "Untitled Trip")
                    }
                    disabled={renameMutation.isPending}
                  >
                    {renameMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingTitle(false);
                      setTitleDraft(trip?.title ?? "");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">
                    {trip?.title ?? "Trip"}
                  </h1>
                  <Badge variant="outline">{trip?.status ?? "DRAFT"}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTitleDraft(trip?.title ?? "");
                      setIsEditingTitle(true);
                    }}
                  >
                    Rename
                  </Button>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {trip?.updatedAt
                  ? `Updated ${formatDate(trip.updatedAt)}`
                  : "Loading trip metadata…"}
              </div>
            </div>
          </div>

          {tripQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading trip…</div>
          ) : null}

          {tripQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Couldn’t load trip</AlertTitle>
              <AlertDescription>
                {tripQuery.error instanceof Error
                  ? tripQuery.error.message
                  : "Failed to load trip."}
              </AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Append new travel details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={appendText}
                onChange={(e) => setAppendText(e.target.value)}
                placeholder="Paste new confirmations or updates..."
                className="min-h-40"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={onSubmitAppend}
                  disabled={!appendText.trim() || reconstructMutation.isPending}
                >
                  {reconstructMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Re-running…
                    </>
                  ) : (
                    "Re-run reconstruction"
                  )}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Client timezone: <span className="font-medium">{tz}</span>
                </div>
              </div>
              {reconstructMutation.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Couldn’t reconstruct</AlertTitle>
                  <AlertDescription>
                    {reconstructMutation.error instanceof Error
                      ? reconstructMutation.error.message
                      : "Reconstruction failed."}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          {latestOutput ? (
            <ReconstructResult
              data={latestOutput}
              itineraryOverride={itineraryOverride}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No successful runs yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Run a reconstruction to see the latest trip output.
              </CardContent>
            </Card>
          )}

          <RunHistory runs={tripQuery.data?.runs ?? []} />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function RunHistory({ runs }: { runs: TripRun[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Run history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {runs.length ? (
          runs.map((run) => (
            <div
              key={run.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  {formatDate(run.createdAt)}
                </div>
                {run.errorMessage ? (
                  <div className="text-xs text-muted-foreground">
                    {run.errorMessage}
                  </div>
                ) : null}
              </div>
              <Badge variant={run.status === "FAILED" ? "destructive" : "secondary"}>
                {run.status}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No runs yet.</div>
        )}
      </CardContent>
    </Card>
  );
}
