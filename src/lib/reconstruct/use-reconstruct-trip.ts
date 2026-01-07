import { useMutation } from "@tanstack/react-query";
import type { ReconstructRequest, TripReconstruction } from "@/lib/api-client";
import { reconstructTrip } from "@/lib/api-client";

export function useReconstructTrip() {
  return useMutation<TripReconstruction, Error, ReconstructRequest>({
    mutationFn: reconstructTrip,
  });
}
