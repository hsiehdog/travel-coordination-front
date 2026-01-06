"use client";

import { authClient } from "@/lib/auth/client";

export function DashboardView() {
  const { data } = authClient.useSession();

  return <div>Hey {data?.user?.name || "there"}</div>;
}
