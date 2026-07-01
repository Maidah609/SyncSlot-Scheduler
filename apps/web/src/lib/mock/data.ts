export type EventLocation = "zoom" | "google-meet" | "phone" | "in-person" | "custom";

export type QuestionType = "text" | "multiple-choice" | "yes-no";

export interface CustomQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}

export interface EventType {
  id: string;
  slug: string;
  title: string;
  duration: number; // minutes
  description: string;
  location: EventLocation;
  color: string; // token key
  active: boolean;
  scheduleName: string;
  questions: CustomQuestion[];
  cancellationPolicy: string;
  bufferBefore: number;
  bufferAfter: number;
  minNoticeHours: number;
  maxFutureDays: number;
  dailyLimit: number | null;
  weeklyLimit: number | null;
}

export interface Host {
  username: string;
  name: string;
  title: string;
  initials: string;
  welcome: string;
  timezone: string;
  eventTypes: EventType[];
}

const defaultQuestions: CustomQuestion[] = [
  { id: "q1", label: "What would you like to focus on in our session?", type: "text", required: true },
];

const hostsData: Host[] = [
  {
    username: "sarah-chen",
    name: "Sarah Chen",
    title: "Career Coach · Ex-Google PM",
    initials: "SC",
    welcome:
      "Book time with me to work through career transitions, interview prep, or leveling up as a PM.",
    timezone: "America/Los_Angeles",
    eventTypes: [
      {
        id: "et-1",
        slug: "intro-15",
        title: "Intro Call",
        duration: 15,
        description: "A quick chat to see if we're a fit and outline what you'd like to work on.",
        location: "google-meet",
        color: "teal",
        active: true,
        scheduleName: "Weekday mornings",
        questions: defaultQuestions,
        cancellationPolicy:
          "Please reschedule at least 12 hours in advance so I can offer the slot to someone else.",
        bufferBefore: 5,
        bufferAfter: 10,
        minNoticeHours: 4,
        maxFutureDays: 60,
        dailyLimit: 4,
        weeklyLimit: 12,
      },
      {
        id: "et-2",
        slug: "strategy-30",
        title: "Career Strategy Session",
        duration: 30,
        description:
          "A focused working session on your current situation — role search, negotiation, or growth plan.",
        location: "zoom",
        color: "teal",
        active: true,
        scheduleName: "Standard hours",
        questions: [
          ...defaultQuestions,
          {
            id: "q2",
            label: "Where are you in your search?",
            type: "multiple-choice",
            required: true,
            options: ["Exploring", "Actively applying", "In final rounds", "Negotiating"],
          },
        ],
        cancellationPolicy: "24 hours notice, please.",
        bufferBefore: 10,
        bufferAfter: 10,
        minNoticeHours: 12,
        maxFutureDays: 45,
        dailyLimit: 3,
        weeklyLimit: 10,
      },
      {
        id: "et-3",
        slug: "deep-dive-60",
        title: "Deep-Dive Working Session",
        duration: 60,
        description:
          "A full hour to work through something meaningful — a portfolio review, a difficult decision, or a plan.",
        location: "zoom",
        color: "teal",
        active: true,
        scheduleName: "Standard hours",
        questions: defaultQuestions,
        cancellationPolicy: "24 hours notice, please.",
        bufferBefore: 15,
        bufferAfter: 15,
        minNoticeHours: 24,
        maxFutureDays: 45,
        dailyLimit: 2,
        weeklyLimit: 6,
      },
    ],
  },
  {
    username: "marcus-reyes",
    name: "Marcus Reyes",
    title: "Sales Strategist · Founder, Reyes Advisory",
    initials: "MR",
    welcome: "Let's find a time that works. I run tight sessions and always send notes after.",
    timezone: "America/New_York",
    eventTypes: [
      {
        id: "et-4",
        slug: "discovery-20",
        title: "Discovery Call",
        duration: 20,
        description: "A short call to understand what you're working on and where I can help.",
        location: "google-meet",
        color: "teal",
        active: true,
        scheduleName: "Standard hours",
        questions: defaultQuestions,
        cancellationPolicy: "Reschedule anytime up to the start of the meeting.",
        bufferBefore: 5,
        bufferAfter: 5,
        minNoticeHours: 2,
        maxFutureDays: 30,
        dailyLimit: 5,
        weeklyLimit: 15,
      },
    ],
  },
];

export function getHosts(): Host[] {
  return hostsData;
}

export function getHost(username: string): Host | undefined {
  return hostsData.find((h) => h.username === username);
}

export function getEventType(username: string, slug: string): EventType | undefined {
  return getHost(username)?.eventTypes.find((e) => e.slug === slug);
}

// --- Dashboard mock (belongs to the logged-in demo host) ---

export interface DemoBooking {
  id: string;
  invitee: string;
  inviteeEmail: string;
  eventTypeTitle: string;
  startsAt: string; // ISO
  duration: number;
  timezone: string;
  status: "upcoming" | "past" | "cancelled";
}

// Fixed base so SSR and client render identical times (no hydration mismatch).
const BASE = new Date("2026-07-15T17:00:00Z").getTime();
function inHours(h: number): string {
  return new Date(BASE + h * 3_600_000).toISOString();
}

export const demoHost = hostsData[0];

export const demoBookings: DemoBooking[] = [
  {
    id: "b1",
    invitee: "Priya Natarajan",
    inviteeEmail: "priya@northwind.co",
    eventTypeTitle: "Career Strategy Session",
    startsAt: inHours(3),
    duration: 30,
    timezone: "America/Los_Angeles",
    status: "upcoming",
  },
  {
    id: "b2",
    invitee: "Daniel Osei",
    inviteeEmail: "daniel.osei@fig.studio",
    eventTypeTitle: "Intro Call",
    startsAt: inHours(28),
    duration: 15,
    timezone: "Europe/London",
    status: "upcoming",
  },
  {
    id: "b3",
    invitee: "Elena Marchetti",
    inviteeEmail: "elena@marchetti.design",
    eventTypeTitle: "Deep-Dive Working Session",
    startsAt: inHours(72),
    duration: 60,
    timezone: "Europe/Rome",
    status: "upcoming",
  },
  {
    id: "b4",
    invitee: "Jordan Kim",
    inviteeEmail: "j.kim@northstar.io",
    eventTypeTitle: "Intro Call",
    startsAt: inHours(120),
    duration: 15,
    timezone: "America/Chicago",
    status: "upcoming",
  },
  {
    id: "b5",
    invitee: "Ana Ribeiro",
    inviteeEmail: "ana@studio-ribeiro.com",
    eventTypeTitle: "Career Strategy Session",
    startsAt: inHours(-30),
    duration: 30,
    timezone: "America/Sao_Paulo",
    status: "past",
  },
  {
    id: "b6",
    invitee: "Wei Zhang",
    inviteeEmail: "wei@zhang.io",
    eventTypeTitle: "Intro Call",
    startsAt: inHours(-72),
    duration: 15,
    timezone: "Asia/Shanghai",
    status: "past",
  },
  {
    id: "b7",
    invitee: "Marcus Bell",
    inviteeEmail: "marcus.b@bellworks.co",
    eventTypeTitle: "Deep-Dive Working Session",
    startsAt: inHours(-168),
    duration: 60,
    timezone: "America/Denver",
    status: "past",
  },
  {
    id: "b8",
    invitee: "Nadia Khan",
    inviteeEmail: "nadia.k@khanadvisory.com",
    eventTypeTitle: "Intro Call",
    startsAt: inHours(48),
    duration: 15,
    timezone: "Asia/Dubai",
    status: "cancelled",
  },
];

export function getBooking(id: string): DemoBooking | undefined {
  return demoBookings.find((b) => b.id === id);
}

export const takenUsernames = new Set([
  "sarah",
  "alex",
  "john",
  "mike",
  "admin",
  "sales",
  "team",
  "hello",
]);
