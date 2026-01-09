"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReconstructResult } from "@/components/reconstruct/reconstruct-result";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";

import type { TripReconstruction } from "@/lib/api-client";
import { createTrip, reconstructTripInTrip } from "@/lib/api-client";
import { useReconstructTrip } from "@/lib/reconstruct/use-reconstruct-trip";

function getClientTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export default function ReconstructPage() {
  const router = useRouter();
  const tz = useMemo(() => getClientTimezone(), []);
  const [rawText, setRawText] = useState("");
  const [data, setData] = useState<TripReconstruction | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setSubmittedText(text);
  };

  const onSaveTrip = async () => {
    if (!data || !submittedText) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const title = data.tripTitle?.trim() || "Untitled Trip";
      const { trip } = await createTrip(title);
      await reconstructTripInTrip(trip.id, {
        rawText: submittedText,
        client: {
          timezone: tz,
          nowIso: new Date().toISOString(),
        },
      });
      router.push(`/dashboard/trips/${trip.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save trip.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Magic Itinerary Reconstructor</CardTitle>
              <CardDescription>
                Paste confirmations, notes, and receipts. Get a structured
                itinerary with risks and missing info.
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

          {data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onSaveTrip} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save as Trip"
                  )}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Saves this reconstruction into a new trip.
                </div>
              </div>

              {saveError ? (
                <Alert variant="destructive">
                  <AlertTitle>Couldn’t save trip</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              ) : null}

              <ReconstructResult data={data} />
            </div>
          ) : null}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
