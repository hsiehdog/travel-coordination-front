"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createTrip, fetchTrips } from "@/lib/api-client";

function formatDate(value: string | null) {
  if (!value) return "No runs yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function TripsPage() {
  const router = useRouter();
  const tripsQuery = useQuery({
    queryKey: ["trips"],
    queryFn: () => fetchTrips(),
  });

  const createMutation = useMutation({
    mutationFn: () => createTrip("Untitled Trip"),
    onSuccess: (response) => {
      router.push(`/dashboard/trips/${response.trip.id}`);
    },
  });

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Trips</h1>
            <p className="text-sm text-muted-foreground">
              Save reconstructions and revisit them anytime.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "New trip"}
            </Button>
            <Button asChild>
              <Link href="/dashboard/reconstruct">New reconstruction</Link>
            </Button>
          </div>
        </div>

        {createMutation.isError ? (
          <div className="text-sm text-destructive">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "Failed to create trip."}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Recent trips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tripsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading trips…</div>
            ) : null}

            {tripsQuery.isError ? (
              <div className="text-sm text-destructive">
                {tripsQuery.error instanceof Error
                  ? tripsQuery.error.message
                  : "Failed to load trips."}
              </div>
            ) : null}

            {tripsQuery.data?.trips?.length ? (
              tripsQuery.data.trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{trip.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Updated: {formatDate(trip.updatedAt)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Latest run: {formatDate(trip.latestRunAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{trip.status}</Badge>
                    <Badge variant="secondary">
                      {trip.latestRunStatus ?? "No runs"}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/trips/${trip.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : tripsQuery.isLoading || tripsQuery.isError ? null : (
              <div className="text-sm text-muted-foreground">
                No trips yet. Run a reconstruction to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </AppShell>
    </ProtectedRoute>
  );
}
