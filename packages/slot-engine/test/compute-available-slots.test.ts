import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { computeAvailableSlots } from "../src/compute-available-slots";
import type { BookingInput, ComputeAvailableSlotsParams, ScheduleInput } from "../src/types";

function makeParams(overrides: Partial<ComputeAvailableSlotsParams> = {}): ComputeAvailableSlotsParams {
  const schedule: ScheduleInput = {
    timezone: "America/New_York",
    availabilityRules: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
    ],
    dateOverrides: [],
  };

  return {
    schedule,
    eventType: {
      durationMinutes: 60,
      bufferBeforeMins: 0,
      bufferAfterMins: 0,
      minNoticeMins: 0,
      maxFutureDays: 30,
    },
    existingBookings: [],
    externalBusyBlocks: [],
    forDate: "2026-01-12",
    invoTimezone: "America/New_York",
    now: DateTime.fromISO("2026-01-01T09:00:00Z"),
    ...overrides,
  };
}

function slotStarts(slots: ReturnType<typeof computeAvailableSlots>) {
  return slots.map((slot) => slot.start);
}

test("plain weekday with no overrides returns expected slots", () => {
  const slots = computeAvailableSlots(makeParams());
  assert.deepEqual(slotStarts(slots), [
    "2026-01-12T09:00:00-05:00",
    "2026-01-12T10:00:00-05:00",
    "2026-01-12T11:00:00-05:00",
  ]);
});

test("date override can close the day entirely", () => {
  const slots = computeAvailableSlots(makeParams({
    schedule: {
      timezone: "America/New_York",
      availabilityRules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }],
      dateOverrides: [{ date: "2026-01-12", isClosed: true }],
    },
  }));

  assert.equal(slots.length, 0);
});

test("date override custom hours replace recurring weekly rule", () => {
  const slots = computeAvailableSlots(makeParams({
    schedule: {
      timezone: "America/New_York",
      availabilityRules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
      dateOverrides: [{ date: "2026-01-12", isClosed: false, startTime: "13:00", endTime: "15:00" }],
    },
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-01-12T13:00:00-05:00",
    "2026-01-12T14:00:00-05:00",
  ]);
});

test("US spring-forward day skips nonexistent local slot labels", () => {
  const slots = computeAvailableSlots(makeParams({
    schedule: {
      timezone: "America/New_York",
      availabilityRules: [],
      dateOverrides: [{ date: "2026-03-08", isClosed: false, startTime: "01:00", endTime: "05:00" }],
    },
    forDate: "2026-03-08",
    now: DateTime.fromISO("2026-03-01T12:00:00Z"),
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-03-08T01:00:00-05:00",
    "2026-03-08T03:00:00-04:00",
    "2026-03-08T04:00:00-04:00",
  ]);
});

test("US fall-back day includes both repeated local 01:00 slots with different offsets", () => {
  const slots = computeAvailableSlots(makeParams({
    schedule: {
      timezone: "America/New_York",
      availabilityRules: [],
      dateOverrides: [{ date: "2026-11-01", isClosed: false, startTime: "00:00", endTime: "04:00" }],
    },
    forDate: "2026-11-01",
    now: DateTime.fromISO("2026-10-25T12:00:00Z"),
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-11-01T00:00:00-04:00",
    "2026-11-01T01:00:00-04:00",
    "2026-11-01T01:00:00-05:00",
    "2026-11-01T02:00:00-05:00",
    "2026-11-01T03:00:00-05:00",
  ]);
});

test("EU spring-forward day skips nonexistent local slot labels", () => {
  const slots = computeAvailableSlots(makeParams({
    schedule: {
      timezone: "Europe/Berlin",
      availabilityRules: [],
      dateOverrides: [{ date: "2026-03-29", isClosed: false, startTime: "01:00", endTime: "05:00" }],
    },
    invoTimezone: "Europe/Berlin",
    forDate: "2026-03-29",
    now: DateTime.fromISO("2026-03-20T12:00:00Z"),
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-03-29T01:00:00+01:00",
    "2026-03-29T03:00:00+02:00",
    "2026-03-29T04:00:00+02:00",
  ]);
});

test("EU fall-back day includes both repeated local 02:00 slots with different offsets", () => {
  const slots = computeAvailableSlots(makeParams({
    schedule: {
      timezone: "Europe/Berlin",
      availabilityRules: [],
      dateOverrides: [{ date: "2026-10-25", isClosed: false, startTime: "01:00", endTime: "05:00" }],
    },
    invoTimezone: "Europe/Berlin",
    forDate: "2026-10-25",
    now: DateTime.fromISO("2026-10-20T12:00:00Z"),
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-10-25T01:00:00+02:00",
    "2026-10-25T02:00:00+02:00",
    "2026-10-25T02:00:00+01:00",
    "2026-10-25T03:00:00+01:00",
    "2026-10-25T04:00:00+01:00",
  ]);
});

test("min notice excludes near-term slots", () => {
  const slots = computeAvailableSlots(makeParams({
    eventType: {
      durationMinutes: 60,
      bufferBeforeMins: 0,
      bufferAfterMins: 0,
      minNoticeMins: 90,
      maxFutureDays: 30,
    },
    now: DateTime.fromISO("2026-01-12T14:30:00Z"),
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-01-12T11:00:00-05:00",
  ]);
});

test("max future window excludes far-out dates", () => {
  const slots = computeAvailableSlots(makeParams({
    forDate: "2026-02-15",
    eventType: {
      durationMinutes: 60,
      bufferBeforeMins: 0,
      bufferAfterMins: 0,
      minNoticeMins: 0,
      maxFutureDays: 7,
    },
    now: DateTime.fromISO("2026-01-01T09:00:00Z"),
  }));

  assert.equal(slots.length, 0);
});

test("daily cap blocks all slots once the cap is reached", () => {
  const bookings: BookingInput[] = [
    {
      startTime: "2026-01-12T14:00:00Z",
      endTime: "2026-01-12T15:00:00Z",
      status: "CONFIRMED",
    },
  ];

  const slots = computeAvailableSlots(makeParams({
    existingBookings: bookings,
    eventType: {
      durationMinutes: 60,
      bufferBeforeMins: 0,
      bufferAfterMins: 0,
      minNoticeMins: 0,
      maxFutureDays: 30,
      dailyLimit: 1,
    },
  }));

  assert.equal(slots.length, 0);
});

test("weekly cap blocks all slots once the cap is reached", () => {
  const bookings: BookingInput[] = [
    {
      startTime: "2026-01-12T14:00:00Z",
      endTime: "2026-01-12T15:00:00Z",
      status: "CONFIRMED",
    },
    {
      startTime: "2026-01-13T14:00:00Z",
      endTime: "2026-01-13T15:00:00Z",
      status: "CONFIRMED",
    },
  ];

  const slots = computeAvailableSlots(makeParams({
    existingBookings: bookings,
    eventType: {
      durationMinutes: 60,
      bufferBeforeMins: 0,
      bufferAfterMins: 0,
      minNoticeMins: 0,
      maxFutureDays: 30,
      weeklyLimit: 2,
    },
  }));

  assert.equal(slots.length, 0);
});

test("buffer time shrinks available windows", () => {
  const slots = computeAvailableSlots(makeParams({
    schedule: {
      timezone: "America/New_York",
      availabilityRules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "11:00" }],
      dateOverrides: [],
    },
    eventType: {
      durationMinutes: 30,
      bufferBeforeMins: 15,
      bufferAfterMins: 15,
      minNoticeMins: 0,
      maxFutureDays: 30,
    },
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-01-12T09:15:00-05:00",
    "2026-01-12T09:45:00-05:00",
    "2026-01-12T10:15:00-05:00",
  ]);
});

test("existing booking removes exactly the conflicting slot", () => {
  const slots = computeAvailableSlots(makeParams({
    existingBookings: [
      {
        startTime: "2026-01-12T15:00:00Z",
        endTime: "2026-01-12T16:00:00Z",
        status: "CONFIRMED",
      },
    ],
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-01-12T09:00:00-05:00",
    "2026-01-12T11:00:00-05:00",
  ]);
});

test("external busy block removes exactly the conflicting slot", () => {
  const slots = computeAvailableSlots(makeParams({
    externalBusyBlocks: [
      {
        start: "2026-01-12T15:00:00Z",
        end: "2026-01-12T16:00:00Z",
      },
    ],
  }));

  assert.deepEqual(slotStarts(slots), [
    "2026-01-12T09:00:00-05:00",
    "2026-01-12T11:00:00-05:00",
  ]);
});

test("invitee timezone conversion returns correct slot times in both zones", () => {
  const slots = computeAvailableSlots(makeParams({
    invoTimezone: "Asia/Karachi",
  }));

  assert.deepEqual(slots.map((slot) => ({
    startUtc: slot.startUtc,
    start: slot.start,
  })), [
    {
      startUtc: "2026-01-12T14:00:00Z",
      start: "2026-01-12T19:00:00+05:00",
    },
    {
      startUtc: "2026-01-12T15:00:00Z",
      start: "2026-01-12T20:00:00+05:00",
    },
    {
      startUtc: "2026-01-12T16:00:00Z",
      start: "2026-01-12T21:00:00+05:00",
    },
  ]);
});
