"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  ingestTripDetails,
  resolvePendingAction,
  renameTrip,
  type ReconstructDay,
  type ReconstructItineraryItem,
  type TripReconstruction,
  type PendingActionCandidate,
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
          state: item.state,
          flight: aiDetails?.flight ?? null,
          lodging: aiDetails?.lodging ?? null,
          meeting: aiDetails?.meeting ?? null,
          meal: aiDetails?.meal ?? null,
        };
      }),
    };
  });
}

function buildFallbackReconstruction(args: {
  tripTitle?: string;
  timezone: string;
  days: ReconstructDay[];
  items: TripItem[];
}): TripReconstruction {
  const dates = args.days
    .map((day) => day.localDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  const startLocalDate = dates[0] ?? null;
  const endLocalDate = dates[dates.length - 1] ?? null;
  const inferredCount = args.items.filter((item) => item.isInferred).length;

  return {
    tripTitle: args.tripTitle ?? "Trip",
    executiveSummary: "Trip details updated. See itinerary below.",
    destinationSummary: "Destination unknown.",
    dateRange: {
      startLocalDate,
      endLocalDate,
      timezone: args.timezone,
    },
    days: args.days,
    risks: [],
    assumptions: [],
    missingInfo: [],
    sourceStats: {
      inputCharCount: 0,
      recognizedItemCount: args.items.length,
      inferredItemCount: inferredCount,
    },
  };
}

export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;
  const tz = useMemo(() => getClientTimezone(), []);
  const queryClient = useQueryClient();

  const [appendText, setAppendText] = useState("");
  const [rebuildFromScratch, setRebuildFromScratch] = useState(false);
  const [forcePatch, setForcePatch] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    pendingActionId: string;
    intentType: "UPDATE" | "CANCEL" | "REPLACE" | "UNKNOWN";
    candidates: PendingActionCandidate[];
  } | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null
  );
  const [lastReconstruction, setLastReconstruction] =
    useState<TripReconstruction | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const tripQuery = useQuery({
    queryKey: ["trips", tripId],
    queryFn: () => fetchTrip(tripId),
  });

  const ingestMutation = useMutation({
    mutationFn: (payload: { rawText: string }) =>
      ingestTripDetails(tripId, {
        rawUpdateText: payload.rawText,
        client: {
          timezone: tz,
          nowIso: new Date().toISOString(),
        },
        mode: rebuildFromScratch ? "rebuild" : forcePatch ? "patch" : undefined,
      }),
    onSuccess: (response) => {
      if (response.status === "NEEDS_CLARIFICATION") {
        setPendingAction({
          pendingActionId: response.pendingActionId,
          intentType: response.intentType,
          candidates: response.candidates,
        });
        setSelectedCandidateId(null);
        return;
      }
      setPendingAction(null);
      setSelectedCandidateId(null);
      setAppendText("");
      queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (payload: { pendingActionId: string; selectedItemId: string }) =>
      resolvePendingAction(payload.pendingActionId, payload.selectedItemId),
    onSuccess: (response) => {
      if (response.status === "APPLIED") {
        setPendingAction(null);
        setSelectedCandidateId(null);
        setAppendText("");
        queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
      }
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
    if (!text || ingestMutation.isPending) return;
    await ingestMutation.mutateAsync({ rawText: text });
  };

  const trip = tripQuery.data?.trip;
  const latestOutput = tripQuery.data?.latestRun?.outputJson ?? null;
  const tripItems = tripQuery.data?.tripItems ?? [];
  const itineraryOverride = tripItems.length
    ? mapTripItemsToDays(tripItems)
    : undefined;
  useEffect(() => {
    if (latestOutput) {
      setLastReconstruction(latestOutput);
    }
  }, [latestOutput, tripId]);

  const fallbackOutput =
    !latestOutput && itineraryOverride
      ? buildFallbackReconstruction({
          tripTitle: trip?.title,
          timezone: tz,
          days: itineraryOverride,
          items: tripItems,
        })
      : null;
  const displayOutput = latestOutput ?? lastReconstruction ?? fallbackOutput;

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
              <CardTitle>Add or update trip details</CardTitle>
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
                  disabled={!appendText.trim() || ingestMutation.isPending}
                >
                  {ingestMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying…
                    </>
                  ) : (
                    "Apply update"
                  )}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Client timezone: <span className="font-medium">{tz}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Button
                  type="button"
                  size="sm"
                  variant={rebuildFromScratch ? "default" : "outline"}
                  onClick={() => {
                    setRebuildFromScratch((prev) => !prev);
                    setForcePatch(false);
                  }}
                >
                  Rebuild from scratch
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={forcePatch ? "default" : "outline"}
                  onClick={() => {
                    setForcePatch((prev) => !prev);
                    setRebuildFromScratch(false);
                  }}
                >
                  Force patch (advanced)
                </Button>
              </div>
              {ingestMutation.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Couldn’t apply update</AlertTitle>
                  <AlertDescription>
                    {ingestMutation.error instanceof Error
                      ? ingestMutation.error.message
                      : "Update failed."}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          {pendingAction ? (
            <Card>
              <CardHeader>
                <CardTitle>Which item should be updated?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  We need clarification to apply the update. Choose the best match.
                </div>
                <div className="space-y-2">
                  {pendingAction.candidates.map((candidate) => (
                    <button
                      key={candidate.itemId}
                      type="button"
                      onClick={() => setSelectedCandidateId(candidate.itemId)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        selectedCandidateId === candidate.itemId
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                    >
                      <div className="font-medium">{candidate.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {candidate.kind} · {candidate.localDate ?? "No date"}{" "}
                        {candidate.localTime ?? ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {candidate.reason}
                      </div>
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    if (!selectedCandidateId) return;
                    resolveMutation.mutate({
                      pendingActionId: pendingAction.pendingActionId,
                      selectedItemId: selectedCandidateId,
                    });
                  }}
                  disabled={!selectedCandidateId || resolveMutation.isPending}
                >
                  {resolveMutation.isPending ? "Applying…" : "Apply selection"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {displayOutput ? (
            <ReconstructResult
              data={displayOutput}
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
