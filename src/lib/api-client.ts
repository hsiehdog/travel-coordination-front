type HttpMethod = "GET" | "POST" | "PATCH";

export type UsageMetric = {
  id: string;
  label: string;
  value: string;
  delta: number;
  helper?: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  status: "online" | "degraded" | "paused";
  updatedAt: string;
  owner: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: "deployment" | "alert" | "usage";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  isOptimistic?: boolean;
};

type AIChatResponse = {
  id?: string;
  role?: "user" | "assistant" | "system";
  text?: string;
  prompt?: string;
  response?: string;
  sessionId?: string;
  model?: string;
  createdAt?: string;
};

export type ReconstructRequest = {
  rawText: string;
  client: {
    timezone: string;
    nowIso?: string;
  };
};

export type ReconstructDateTimeField = {
  localDate: string | null; // YYYY-MM-DD
  localTime: string | null; // HH:mm
  timezone: string | null; // IANA
  iso: string | null; // ISO string
};

export type ReconstructItineraryItemKind =
  | "FLIGHT"
  | "LODGING"
  | "MEETING"
  | "MEAL"
  | "TRANSPORT"
  | "ACTIVITY"
  | "NOTE"
  | "OTHER";

export type ReconstructItineraryItem = {
  id: string;
  kind: ReconstructItineraryItemKind;
  title: string;
  start: ReconstructDateTimeField;
  end: ReconstructDateTimeField;
  locationText: string | null;
  isInferred: boolean;
  confidence: number;
  sourceSnippet: string | null;
  flight?: {
    airlineName: string | null;
    airlineCode: string | null;
    flightNumber: string | null;
    origin: string | null;
    destination: string | null;
    pnr: string | null;
  } | null;
  lodging?: {
    name: string | null;
    address: string | null;
    checkIn: ReconstructDateTimeField | null;
    checkOut: ReconstructDateTimeField | null;
    confirmationNumber: string | null;
  } | null;
  meeting?: {
    organizer: string | null;
    attendees: string[] | null;
    videoLink: string | null;
    locationName: string | null;
  } | null;
  meal?: {
    venue: string | null;
    mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "DRINKS" | "OTHER" | null;
    reservationName: string | null;
    confirmationNumber: string | null;
  } | null;
};

export type ReconstructDay = {
  dayIndex: number;
  label: string;
  localDate: string | null;
  items: ReconstructItineraryItem[];
};

export type ReconstructRisk = {
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  message: string;
  itemIds: string[];
};

export type ReconstructAssumption = {
  message: string;
  relatedItemIds: string[];
};

export type ReconstructMissingInfo = {
  prompt: string;
  relatedItemIds: string[];
};

export type TripReconstruction = {
  tripTitle: string;
  executiveSummary: string;
  destinationSummary: string;
  dateRange: {
    startLocalDate: string | null;
    endLocalDate: string | null;
    timezone: string;
  };
  days: ReconstructDay[];
  risks: ReconstructRisk[];
  assumptions: ReconstructAssumption[];
  missingInfo: ReconstructMissingInfo[];
  sourceStats: {
    inputCharCount: number;
    recognizedItemCount: number;
    inferredItemCount: number;
  };
  _meta?: {
    rawText?: {
      rawTextTruncated?: boolean;
      rawTextOriginalChars?: number;
      rawTextKeptChars?: number;
      rawTextOmittedChars?: number;
    };
  };
};

export type Trip = {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

export type TripSummary = {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  updatedAt: string;
  latestRunAt: string | null;
  latestRunStatus: "SUCCESS" | "FAILED" | null;
};

export type TripRun = {
  id: string;
  status: "SUCCESS" | "FAILED";
  createdAt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type TripItem = {
  id: string;
  kind: ReconstructItineraryItemKind;
  title: string;
  startIso: string | null;
  endIso: string | null;
  timezone: string | null;
  startTimezone: string | null;
  endTimezone: string | null;
  startLocalDate: string | null;
  startLocalTime: string | null;
  endLocalDate: string | null;
  endLocalTime: string | null;
  locationText: string | null;
  isInferred: boolean;
  confidence: number;
  sourceSnippet: string | null;
  state: "PROPOSED" | "CONFIRMED" | "DISMISSED";
  source: "AI" | "USER" | "CALENDAR" | "EMAIL";
  fingerprint: string;
  metadata: Record<string, unknown> | null;
  updatedAt: string;
};

export type TripDetailResponse = {
  trip: Trip;
  latestRun: {
    id: string;
    status: "SUCCESS";
    createdAt: string;
    outputJson: TripReconstruction;
  } | null;
  runs: TripRun[];
  tripItems: TripItem[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const isMock = !API_BASE_URL;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: Record<string, unknown>
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const headers = new Headers({
    "Content-Type": "application/json",
  });

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unexpected API error");
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

const mockData = {
  usage: [
    { id: "tokens", label: "Tokens processed", value: "1.2M", delta: 12 },
    { id: "latency", label: "Avg. latency", value: "820ms", delta: -4 },
    { id: "users", label: "Active users", value: "864", delta: 8 },
    { id: "costs", label: "Spend this week", value: "$1,870", delta: -2 },
  ] satisfies UsageMetric[],
  projects: [
    {
      id: "copilot",
      name: "Developer Copilot",
      status: "online",
      updatedAt: "2 minutes ago",
      owner: "Platform",
    },
    {
      id: "agenthub",
      name: "Agent Hub",
      status: "degraded",
      updatedAt: "8 minutes ago",
      owner: "Automation",
    },
    {
      id: "insights",
      name: "Insights Assistant",
      status: "paused",
      updatedAt: "45 minutes ago",
      owner: "Revenue",
    },
  ] satisfies ProjectSummary[],
  activity: [
    {
      id: "deploy-1",
      title: "New agent deployed",
      description: "v0.12.4 rolled out to production",
      timestamp: "Today · 10:42 AM",
      category: "deployment",
    },
    {
      id: "alert-1",
      title: "Latency spike detected",
      description: "LLM provider response time exceeded SLO",
      timestamp: "Today · 9:17 AM",
      category: "alert",
    },
    {
      id: "usage-1",
      title: "Usage milestone",
      description: "Surpassed 1M prompts this week",
      timestamp: "Yesterday · 6:03 PM",
      category: "usage",
    },
  ] satisfies ActivityItem[],
  chat: [
    {
      id: "intro-1",
      role: "assistant",
      content:
        "Hi! Ask me anything about your AI workloads—deployments, tokens, incidents, or experimentation.",
      createdAt: new Date().toISOString(),
    },
  ] satisfies ChatMessage[],
  trips: [
    {
      id: "trip_1",
      title: "NYC Client Meetings",
      status: "ACTIVE",
      updatedAt: new Date().toISOString(),
      latestRunAt: new Date().toISOString(),
      latestRunStatus: "SUCCESS",
    },
  ] satisfies TripSummary[],
};

export async function fetchUsageMetrics(): Promise<UsageMetric[]> {
  if (isMock) {
    await delay(300);
    return mockData.usage;
  }

  return request<UsageMetric[]>("/analytics/usage", "GET");
}

export async function fetchProjectSummaries(): Promise<ProjectSummary[]> {
  if (isMock) {
    await delay(320);
    return mockData.projects;
  }

  return request<ProjectSummary[]>("/projects", "GET");
}

export async function fetchActivityFeed(): Promise<ActivityItem[]> {
  if (isMock) {
    await delay(280);
    return mockData.activity;
  }

  return request<ActivityItem[]>("/activity", "GET");
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  if (isMock) {
    await delay(200);
    return mockData.chat;
  }

  const response = await request<{ sessions: AIChatResponse[] }>(
    "/users/me/sessions",
    "GET"
  );
  return (response.sessions || [])
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
    )
    .flatMap((entry) => mapSessionToMessages(entry));
}

export async function sendChatMessage(message: string): Promise<ChatMessage> {
  if (isMock) {
    await delay(600);
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Here’s a mocked response describing what your managed LLM endpoint would have answered.",
      createdAt: new Date().toISOString(),
    };
  }

  const response = await request<{ data: AIChatResponse }>(
    "/ai/generate",
    "POST",
    {
      prompt: message,
    }
  );

  return mapToChatMessage(response.data);
}

export async function reconstructTrip(
  payload: ReconstructRequest
): Promise<TripReconstruction> {
  if (isMock) {
    await delay(650);
    return {
      tripTitle: "NYC Client Meetings",
      executiveSummary:
        "Two-day client meetings in New York with evening arrivals and a morning return. One tight connection risk; hotel check-in is assumed based on dates.",
      destinationSummary: "New York, NY",
      dateRange: {
        startLocalDate: "2025-03-12",
        endLocalDate: "2025-03-14",
        timezone: "America/New_York",
      },
      days: [
        {
          dayIndex: 1,
          label: "Wed, Mar 12",
          localDate: "2025-03-12",
          items: [
            {
              id: "itm_flt_1",
              kind: "FLIGHT",
              title: "Flight to JFK",
              start: {
                localDate: "2025-03-12",
                localTime: "18:25",
                timezone: "America/Los_Angeles",
                iso: "2025-03-12T18:25:00-08:00",
              },
              end: {
                localDate: "2025-03-13",
                localTime: "02:45",
                timezone: "America/New_York",
                iso: "2025-03-13T02:45:00-05:00",
              },
              locationText: "LAX → JFK",
              isInferred: false,
              confidence: 0.92,
              sourceSnippet: "Depart LAX 6:25 PM, arrive JFK 2:45 AM",
            },
          ],
        },
        {
          dayIndex: 2,
          label: "Thu, Mar 13",
          localDate: "2025-03-13",
          items: [
            {
              id: "itm_meet_1",
              kind: "MEETING",
              title: "Client kickoff meeting",
              start: {
                localDate: "2025-03-13",
                localTime: "10:00",
                timezone: "America/New_York",
                iso: "2025-03-13T10:00:00-05:00",
              },
              end: {
                localDate: "2025-03-13",
                localTime: "11:30",
                timezone: "America/New_York",
                iso: "2025-03-13T11:30:00-05:00",
              },
              locationText: "Midtown Manhattan",
              isInferred: false,
              confidence: 0.88,
              sourceSnippet: "Kickoff meeting 10:00–11:30 AM",
            },
          ],
        },
      ],
      risks: [
        {
          severity: "MEDIUM",
          title: "Potentially tight arrival window",
          message:
            "Arriving after midnight may compress rest before the 10:00 AM meeting.",
          itemIds: ["itm_flt_1", "itm_meet_1"],
        },
      ],
      assumptions: [
        {
          message: "Hotel check-in is assumed on Mar 12 based on arrival date.",
          relatedItemIds: ["itm_flt_1"],
        },
      ],
      missingInfo: [
        {
          prompt: "Which hotel will you be staying at in New York?",
          relatedItemIds: [],
        },
      ],
      sourceStats: {
        inputCharCount: payload.rawText.length,
        recognizedItemCount: 2,
        inferredItemCount: 0,
      },
    };
  }

  // Your request<T> helper already includes credentials + JSON
  return request<TripReconstruction>("/ai/reconstruct", "POST", payload as any);
}

export async function createTrip(title: string): Promise<{ trip: Trip }> {
  if (isMock) {
    await delay(250);
    return {
      trip: {
        id: crypto.randomUUID(),
        title,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  return request<{ trip: Trip }>("/trips", "POST", { title });
}

export async function fetchTrips(): Promise<{ trips: TripSummary[] }> {
  if (isMock) {
    await delay(200);
    return { trips: mockData.trips };
  }

  return request<{ trips: TripSummary[] }>("/trips", "GET");
}

export async function fetchTrip(tripId: string): Promise<TripDetailResponse> {
  if (isMock) {
    await delay(250);
    const mockOutput = await reconstructTrip({
      rawText: "Mock text",
      client: { timezone: "America/Los_Angeles" },
    });
      const mockItems: TripItem[] = mockOutput.days.flatMap((day) =>
      day.items.map((item, index) => ({
        id: `${item.id}-${index}`,
        kind: item.kind,
        title: item.title,
        startIso: item.start.iso,
        endIso: item.end.iso,
        timezone: item.start.timezone ?? item.end.timezone,
        startTimezone: item.start.timezone,
        endTimezone: item.end.timezone,
        startLocalDate: item.start.localDate,
        startLocalTime: item.start.localTime,
        endLocalDate: item.end.localDate,
        endLocalTime: item.end.localTime,
        locationText: item.locationText,
        isInferred: item.isInferred,
        confidence: item.confidence,
        sourceSnippet: item.sourceSnippet,
        state: "PROPOSED",
        source: "AI",
        fingerprint: `${item.id}-fp`,
        metadata: null,
        updatedAt: new Date().toISOString(),
      }))
    );
    return {
      trip: {
        id: tripId,
        title: "NYC Client Meetings",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      latestRun: {
        id: "run_1",
        status: "SUCCESS",
        createdAt: new Date().toISOString(),
        outputJson: mockOutput,
      },
      runs: [
        {
          id: "run_1",
          status: "SUCCESS",
          createdAt: new Date().toISOString(),
          errorCode: null,
          errorMessage: null,
        },
      ],
      tripItems: mockItems,
    };
  }

  return request<TripDetailResponse>(`/trips/${tripId}`, "GET");
}

export async function reconstructTripInTrip(
  tripId: string,
  payload: ReconstructRequest
): Promise<TripReconstruction> {
  if (isMock) {
    await delay(650);
    return reconstructTrip(payload);
  }

  return request<TripReconstruction>(
    `/trips/${tripId}/reconstruct`,
    "POST",
    payload as any
  );
}

export async function renameTrip(
  tripId: string,
  title: string
): Promise<{ trip: Trip }> {
  if (isMock) {
    await delay(200);
    return {
      trip: {
        id: tripId,
        title,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  return request<{ trip: Trip }>(`/trips/${tripId}`, "PATCH", { title });
}

export async function updateUserProfile(
  payload: UpdateUserPayload
): Promise<void> {
  if (isMock) {
    await delay(300);
    return;
  }

  await request("/users/me", "PATCH", payload);
}

export async function changeUserPassword(
  payload: ChangePasswordPayload
): Promise<void> {
  if (isMock) {
    await delay(300);
    return;
  }

  await request("/users/me/change-password", "POST", payload);
}

function mapToChatMessage(
  payload: AIChatResponse,
  fallbackRole: ChatMessage["role"] = "assistant"
): ChatMessage {
  const content = payload.text ?? payload.response ?? payload.prompt ?? "";
  return {
    id: payload.id || crypto.randomUUID(),
    role: payload.role || fallbackRole,
    content,
    createdAt: payload.createdAt || new Date().toISOString(),
  };
}

function mapSessionToMessages(session: AIChatResponse): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (session.prompt) {
    messages.push(
      mapToChatMessage(
        {
          id: `${session.id || crypto.randomUUID()}-prompt`,
          role: "user",
          text: session.prompt,
          createdAt: session.createdAt,
        },
        "user"
      )
    );
  }
  messages.push(
    mapToChatMessage(
      {
        id: `${session.id || crypto.randomUUID()}-response`,
        text: session.response ?? session.text ?? "",
        createdAt: session.createdAt,
      },
      "assistant"
    )
  );
  return messages;
}
export type UpdateUserPayload = {
  name?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
