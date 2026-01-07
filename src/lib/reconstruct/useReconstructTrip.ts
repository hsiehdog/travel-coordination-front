import { useMutation } from "@tanstack/react-query";
import type { ReconstructRequest, TripReconstruction } from "../api-client";
import { reconstructTrip } from "../api-client";

export function useReconstructTrip() {
  return useMutation<TripReconstruction, Error, ReconstructRequest>({
    mutationFn: reconstructTrip,
  });
}
