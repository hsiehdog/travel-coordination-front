"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type {
  TripReconstruction,
  ReconstructItineraryItem,
} from "@/lib/api-client";
import { useReconstructTrip } from "@/lib/reconstruct/use-reconstruct-trip";

function getClientTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function fmtRange(a: string | null, b: string | null) {
  return `${a ?? "?"} → ${b ?? "?"}`;
}

function fmtDT(dt: {
  localDate: string | null;
  localTime: string | null;
  timezone: string | null;
  iso: string | null;
}) {
  if (dt.localDate && dt.localTime) {
    return `${dt.localDate} ${dt.localTime}${
      dt.timezone ? ` (${dt.timezone})` : ""
    }`;
  }
  return dt.iso ?? "Unknown";
}

export default function ReconstructPage() {
  const tz = useMemo(() => getClientTimezone(), []);
  const [rawText, setRawText] = useState("");
  const [data, setData] = useState<TripReconstruction | null>(null);

  const reconstruct = useReconstructTrip();

  const onOrganize = async () => {
    const text = rawText.trim();
    if (!text) return;

    const result = await reconstruct.mutateAsync({
      rawText: text,
      client: {
        timezone: tz,
        nowIso: new Date().toISOString(),
      },
    });

    setData(result);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Magic Itinerary Reconstructor</CardTitle>
          <CardDescription>
            Paste confirmations, notes, and receipts. Get a structured itinerary
            with risks and missing info.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste flight emails, hotel confirmations, meeting notes, restaurant addresses…"
            className="min-h-60"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={onOrganize}
              disabled={reconstruct.isPending || !rawText.trim()}
            >
              {reconstruct.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Organizing…
                </>
              ) : (
                "Organize"
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              Client timezone: <span className="font-medium">{tz}</span>
            </div>
          </div>

          {reconstruct.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Couldn’t reconstruct</AlertTitle>
              <AlertDescription>{reconstruct.error.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {data ? <ResultView data={data} /> : null}
    </div>
  );
}

function ResultView({ data }: { data: TripReconstruction }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{data.tripTitle}</CardTitle>
          <CardDescription>{data.executiveSummary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{data.destinationSummary}</Badge>
          <Badge variant="outline">
            {fmtRange(
              data.dateRange.startLocalDate,
              data.dateRange.endLocalDate
            )}
          </Badge>
          <Badge variant="outline">{data.dateRange.timezone}</Badge>
          <Badge variant="outline">
            Items: {data.sourceStats.recognizedItemCount} (Inferred:{" "}
            {data.sourceStats.inferredItemCount})
          </Badge>
        </CardContent>
      </Card>

      {data.risks.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Risks</CardTitle>
            <CardDescription>Potential issues to double-check.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.risks.map((r, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{r.severity}</Badge>
                  <div className="font-medium">{r.title}</div>
                </div>
                <div className="text-sm text-muted-foreground">{r.message}</div>
                {r.itemIds.length ? (
                  <div className="text-xs text-muted-foreground">
                    Related items: {r.itemIds.join(", ")}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Itinerary</CardTitle>
          <CardDescription>Day-grouped timeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.days.map((day) => (
            <div key={day.dayIndex} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{day.label}</div>
                {day.localDate ? (
                  <Badge variant="outline">{day.localDate}</Badge>
                ) : null}
              </div>

              <div className="space-y-2">
                {day.items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {data.assumptions.length || data.missingInfo.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Assumptions</CardTitle>
              <CardDescription>Inferences made explicitly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.assumptions.length ? (
                data.assumptions.map((a, i) => (
                  <div key={i} className="rounded-xl border p-4 space-y-2">
                    <div className="text-sm">{a.message}</div>
                    {a.relatedItemIds.length ? (
                      <div className="text-xs text-muted-foreground">
                        Related items: {a.relatedItemIds.join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">None.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missing info</CardTitle>
              <CardDescription>Questions to confirm details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.missingInfo.length ? (
                data.missingInfo.map((m, i) => (
                  <div key={i} className="rounded-xl border p-4 space-y-2">
                    <div className="text-sm">{m.prompt}</div>
                    {m.relatedItemIds.length ? (
                      <div className="text-xs text-muted-foreground">
                        Related items: {m.relatedItemIds.join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">None.</div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function ItemCard({ item }: { item: ReconstructItineraryItem }) {
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{item.kind}</Badge>
            {item.isInferred ? (
              <Badge variant="secondary">Inferred</Badge>
            ) : null}
            <span className="text-sm text-muted-foreground">
              {Math.round(item.confidence * 100)}%
            </span>
          </div>
          <div className="font-semibold">{item.title}</div>
          {item.locationText ? (
            <div className="text-sm text-muted-foreground">
              {item.locationText}
            </div>
          ) : null}
        </div>

        <div className="text-xs text-muted-foreground text-right">
          <div>Start: {fmtDT(item.start)}</div>
          <div>End: {fmtDT(item.end)}</div>
        </div>
      </div>

      {item.sourceSnippet ? (
        <div className="text-xs text-muted-foreground border-l pl-3">
          {item.sourceSnippet}
        </div>
      ) : null}
    </div>
  );
}
