import { DateTime } from "luxon";
import type {
  AvailabilityRuleInput,
  BookingInput,
  BusyBlockInput,
  ComputeAvailableSlotsParams,
  DateOverrideInput,
  Slot,
} from "./types";

type Interval = {
  startUtc: DateTime;
  endUtc: DateTime;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function computeAvailableSlots(params: ComputeAvailableSlotsParams): Slot[] {
  const {
    schedule,
    eventType,
    existingBookings,
    externalBusyBlocks,
    forDate,
    invoTimezone,
    now,
  } = params;

  if (!now.isValid) {
    throw new RangeError("now must be a valid Luxon DateTime.");
  }

  validateEventType(eventType);

  const queryDate = DateTime.fromISO(forDate, { zone: schedule.timezone }).startOf("day");
  if (!queryDate.isValid) {
    throw new RangeError(`forDate must be a valid ISO date in the schedule timezone: ${forDate}`);
  }

  const intervals = resolveIntervals(forDate, schedule.timezone, schedule.availabilityRules, schedule.dateOverrides);
  if (intervals.length === 0) {
    return [];
  }

  const activeBookings = existingBookings
    .filter((booking) => booking.status !== "CANCELLED")
    .map((booking) => ({
      startUtc: toUtcDateTime(booking.startTime),
      endUtc: toUtcDateTime(booking.endTime),
    }));
  const busyBlocks = externalBusyBlocks.map((block) => ({
    startUtc: toUtcDateTime(block.start),
    endUtc: toUtcDateTime(block.end),
  }));

  const minNoticeCutoffUtc = now.toUTC().plus({ minutes: eventType.minNoticeMins });
  const maxFutureCutoffUtc = now.toUTC().plus({ days: eventType.maxFutureDays });

  if (eventType.dailyLimit && countBookingsForDay(activeBookings, queryDate, schedule.timezone) >= eventType.dailyLimit) {
    return [];
  }

  if (eventType.weeklyLimit && countBookingsForWeek(activeBookings, queryDate, schedule.timezone) >= eventType.weeklyLimit) {
    return [];
  }

  const slots: Slot[] = [];

  for (const interval of intervals) {
    let candidateStartUtc = interval.startUtc.plus({ minutes: eventType.bufferBeforeMins });
    const candidateBoundaryEndUtc = interval.endUtc.minus({ minutes: eventType.bufferAfterMins });

    while (candidateStartUtc.isValid) {
      const candidateEndUtc = candidateStartUtc.plus({ minutes: eventType.durationMinutes });

      if (candidateEndUtc > candidateBoundaryEndUtc) {
        break;
      }

      if (candidateStartUtc < minNoticeCutoffUtc) {
        candidateStartUtc = candidateStartUtc.plus({ minutes: eventType.durationMinutes });
        continue;
      }

      if (candidateStartUtc > maxFutureCutoffUtc) {
        break;
      }

      const bufferedStartUtc = candidateStartUtc.minus({ minutes: eventType.bufferBeforeMins });
      const bufferedEndUtc = candidateEndUtc.plus({ minutes: eventType.bufferAfterMins });

      const overlapsExistingBooking = activeBookings.some((booking) =>
        intervalsOverlap(bufferedStartUtc, bufferedEndUtc, booking.startUtc, booking.endUtc));
      const overlapsExternalBusy = busyBlocks.some((block) =>
        intervalsOverlap(bufferedStartUtc, bufferedEndUtc, block.startUtc, block.endUtc));

      if (!overlapsExistingBooking && !overlapsExternalBusy) {
        const inviteeStart = candidateStartUtc.setZone(invoTimezone);
        const inviteeEnd = candidateEndUtc.setZone(invoTimezone);

        if (!inviteeStart.isValid || !inviteeEnd.isValid) {
          throw new RangeError(`invoTimezone must be a valid IANA timezone: ${invoTimezone}`);
        }

        slots.push({
          startUtc: toIsoString(candidateStartUtc.toUTC()),
          endUtc: toIsoString(candidateEndUtc.toUTC()),
          start: toIsoString(inviteeStart),
          end: toIsoString(inviteeEnd),
          timezone: invoTimezone,
        });
      }

      candidateStartUtc = candidateStartUtc.plus({ minutes: eventType.durationMinutes });
    }
  }

  return slots;
}

function validateEventType(eventType: ComputeAvailableSlotsParams["eventType"]) {
  const numericFields = [
    ["durationMinutes", eventType.durationMinutes],
    ["bufferBeforeMins", eventType.bufferBeforeMins],
    ["bufferAfterMins", eventType.bufferAfterMins],
    ["minNoticeMins", eventType.minNoticeMins],
    ["maxFutureDays", eventType.maxFutureDays],
  ] as const;

  for (const [field, value] of numericFields) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${field} must be a non-negative finite number.`);
    }
  }

  if (eventType.durationMinutes <= 0) {
    throw new RangeError("durationMinutes must be greater than zero.");
  }

  if (eventType.maxFutureDays <= 0) {
    throw new RangeError("maxFutureDays must be greater than zero.");
  }

  if (eventType.dailyLimit !== undefined && eventType.dailyLimit !== null && eventType.dailyLimit <= 0) {
    throw new RangeError("dailyLimit must be greater than zero when provided.");
  }

  if (eventType.weeklyLimit !== undefined && eventType.weeklyLimit !== null && eventType.weeklyLimit <= 0) {
    throw new RangeError("weeklyLimit must be greater than zero when provided.");
  }
}

function resolveIntervals(
  forDate: string,
  timezone: string,
  rules: AvailabilityRuleInput[],
  overrides: DateOverrideInput[],
): Interval[] {
  const override = overrides.find((item) => normalizeDate(item.date) === forDate);
  if (override) {
    if (override.isClosed) {
      return [];
    }

    if (!override.startTime || !override.endTime) {
      throw new RangeError("Open date overrides must provide startTime and endTime.");
    }

    return [buildUtcInterval(forDate, timezone, override.startTime, override.endTime)];
  }

  const queryDate = DateTime.fromISO(forDate, { zone: timezone }).startOf("day");
  const dayOfWeek = queryDate.weekday % 7;

  return rules
    .filter((rule) => rule.dayOfWeek === dayOfWeek)
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
    .map((rule) => buildUtcInterval(forDate, timezone, rule.startTime, rule.endTime));
}

function buildUtcInterval(forDate: string, timezone: string, startTime: string, endTime: string): Interval {
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    throw new RangeError("Time values must be in HH:MM 24-hour format.");
  }

  const localStart = DateTime.fromISO(`${forDate}T${startTime}`, { zone: timezone, setZone: true });
  const localEnd = DateTime.fromISO(`${forDate}T${endTime}`, { zone: timezone, setZone: true });

  if (!localStart.isValid || !localEnd.isValid) {
    throw new RangeError(`Invalid local time interval for ${forDate} in timezone ${timezone}.`);
  }

  const startUtc = localStart.toUTC();
  const endUtc = localEnd.toUTC();

  if (endUtc <= startUtc) {
    throw new RangeError("Interval end must be later than interval start.");
  }

  return { startUtc, endUtc };
}

function toUtcDateTime(value: Date | string | DateTime) {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: "utc" }).toUTC();
  }

  if (typeof value === "string") {
    const parsed = DateTime.fromISO(value, { setZone: true });
    if (!parsed.isValid) {
      throw new RangeError(`Invalid ISO datetime value: ${value}`);
    }
    return parsed.toUTC();
  }

  if (!value.isValid) {
    throw new RangeError("Invalid Luxon DateTime value.");
  }

  return value.toUTC();
}

function countBookingsForDay(bookings: Interval[], queryDate: DateTime, timezone: string) {
  const dayStart = queryDate.startOf("day");
  const dayEnd = dayStart.endOf("day");

  return bookings.filter((booking) => {
    const localStart = booking.startUtc.setZone(timezone);
    return localStart >= dayStart && localStart <= dayEnd;
  }).length;
}

function countBookingsForWeek(bookings: Interval[], queryDate: DateTime, timezone: string) {
  const weekStart = queryDate.startOf("week");
  const weekEnd = weekStart.plus({ days: 6 }).endOf("day");

  return bookings.filter((booking) => {
    const localStart = booking.startUtc.setZone(timezone);
    return localStart >= weekStart && localStart <= weekEnd;
  }).length;
}

function intervalsOverlap(
  leftStart: DateTime,
  leftEnd: DateTime,
  rightStart: DateTime,
  rightEnd: DateTime,
) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function normalizeDate(value: string) {
  return value.slice(0, 10);
}

function toIsoString(value: DateTime) {
  const iso = value.toISO({ suppressMilliseconds: true });
  if (!iso) {
    throw new RangeError("Expected a valid Luxon DateTime to serialize to ISO.");
  }

  return iso;
}
