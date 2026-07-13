import type { DateTime } from "luxon";

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type DateOverrideInput = {
  date: string;
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export type ScheduleInput = {
  timezone: string;
  availabilityRules: AvailabilityRuleInput[];
  dateOverrides: DateOverrideInput[];
};

export type EventTypeInput = {
  durationMinutes: number;
  bufferBeforeMins: number;
  bufferAfterMins: number;
  minNoticeMins: number;
  maxFutureDays: number;
  dailyLimit?: number | null;
  weeklyLimit?: number | null;
};

export type BookingStatus = "CONFIRMED" | "CANCELLED" | "RESCHEDULED";

export type BookingInput = {
  startTime: Date | string | DateTime;
  endTime: Date | string | DateTime;
  status?: BookingStatus;
};

export type BusyBlockInput = {
  start: Date | string | DateTime;
  end: Date | string | DateTime;
};

export type ComputeAvailableSlotsParams = {
  schedule: ScheduleInput;
  eventType: EventTypeInput;
  existingBookings: BookingInput[];
  externalBusyBlocks: BusyBlockInput[];
  forDate: string;
  invoTimezone: string;
  now: DateTime;
};

export type Slot = {
  startUtc: string;
  endUtc: string;
  start: string;
  end: string;
  timezone: string;
};
