"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  TripReconstruction,
  ReconstructItineraryItem,
} from "@/lib/api-client";

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

export function ReconstructResult({
  data,
  itineraryOverride,
}: {
  data: TripReconstruction;
  itineraryOverride?: TripReconstruction["days"];
}) {
  const truncation = data._meta?.rawText;
  const days = itineraryOverride ?? data.days;
  return (
    <div className="space-y-6">
      {truncation?.rawTextTruncated ? (
        <Alert>
          <AlertTitle>Source text was truncated</AlertTitle>
          <AlertDescription>
            The latest input was capped to keep the newest content. Omitted{" "}
            {truncation.rawTextOmittedChars ?? "some"} characters.
          </AlertDescription>
        </Alert>
      ) : null}
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
          {days.map((day) => (
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
  const flight = item.flight ?? null;
  const lodging = item.lodging ?? null;
  const meeting = item.meeting ?? null;
  const meal = item.meal ?? null;

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

      {flight ? (
        <div className="text-xs text-muted-foreground">
          {flight.airlineName || flight.airlineCode || flight.flightNumber ? (
            <div>
              Flight:{" "}
              {[flight.airlineName, flight.airlineCode, flight.flightNumber]
                .filter(Boolean)
                .join(" ")}
            </div>
          ) : null}
          {flight.origin || flight.destination ? (
            <div>
              Route: {[flight.origin, flight.destination].filter(Boolean).join(" → ")}
            </div>
          ) : null}
          {flight.pnr ? <div>PNR: {flight.pnr}</div> : null}
        </div>
      ) : null}

      {lodging ? (
        <div className="text-xs text-muted-foreground">
          {lodging.name ? <div>Lodging: {lodging.name}</div> : null}
          {lodging.address ? <div>Address: {lodging.address}</div> : null}
          {lodging.confirmationNumber ? (
            <div>Confirmation: {lodging.confirmationNumber}</div>
          ) : null}
        </div>
      ) : null}

      {meeting ? (
        <div className="text-xs text-muted-foreground">
          {meeting.organizer ? <div>Organizer: {meeting.organizer}</div> : null}
          {meeting.locationName ? (
            <div>Location: {meeting.locationName}</div>
          ) : null}
          {meeting.videoLink ? <div>Video link: {meeting.videoLink}</div> : null}
          {meeting.attendees?.length ? (
            <div>Attendees: {meeting.attendees.join(", ")}</div>
          ) : null}
        </div>
      ) : null}

      {meal ? (
        <div className="text-xs text-muted-foreground">
          {meal.venue ? <div>Venue: {meal.venue}</div> : null}
          {meal.mealType ? <div>Meal: {meal.mealType}</div> : null}
          {meal.reservationName ? (
            <div>Reservation: {meal.reservationName}</div>
          ) : null}
          {meal.confirmationNumber ? (
            <div>Confirmation: {meal.confirmationNumber}</div>
          ) : null}
        </div>
      ) : null}

      {item.sourceSnippet ? (
        <div className="text-xs text-muted-foreground border-l pl-3">
          {item.sourceSnippet}
        </div>
      ) : null}
    </div>
  );
}
