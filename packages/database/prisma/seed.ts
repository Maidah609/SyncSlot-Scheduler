import { randomUUID } from "node:crypto";
import { PrismaClient, BookingQuestionType, BookingStatus, LocationType } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromToday(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function atUtc(date: Date, hours: number, minutes = 0) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
    0,
    0,
  ));
}

function nextWeekday(dayOfWeek: number) {
  const today = daysFromToday(0);
  const currentDay = today.getUTCDay();
  const delta = (dayOfWeek - currentDay + 7) % 7 || 7;
  return daysFromToday(delta);
}

async function main() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "BookingAuditLog",
      "BookingQuestion",
      "Booking",
      "EventType",
      "DateOverride",
      "AvailabilityRule",
      "CalendarSyncCursor",
      "CalendarAccount",
      "NotificationDelivery",
      "WebhookEndpoint",
      "EmailVerificationToken",
      "PasswordResetToken",
      "CredentialAccount",
      "Schedule",
      "User"
    RESTART IDENTITY CASCADE;
  `);

  const host = await prisma.user.create({
    data: {
      email: "host@syncslot.dev",
      emailVerifiedAt: new Date(),
      passwordHash: "$2b$12$seededhostpasswordhashplaceholder000000000000000000000",
      name: "Seed Host",
      username: "seed-host",
      title: "Scheduling strategist",
      welcome: "Book time with me to talk through scheduling workflows and product decisions.",
      timezone: "UTC",
      onboardingCompletedAt: new Date(),
    },
  });

  const schedule = await prisma.schedule.create({
    data: {
      userId: host.id,
      name: "Default Schedule",
      isDefault: true,
      timezone: host.timezone,
      availabilityRules: {
        create: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 3, startTime: "09:00", endTime: "12:00" },
          { dayOfWeek: 3, startTime: "13:00", endTime: "17:00" },
          { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
        ],
      },
    },
  });

  await prisma.dateOverride.create({
    data: {
      scheduleId: schedule.id,
      date: nextWeekday(2),
      isClosed: true,
    },
  });

  const introCall = await prisma.eventType.create({
    data: {
      userId: host.id,
      title: "Intro Call",
      slug: "intro-call",
      durationMinutes: 30,
      description: "A quick conversation to understand goals and next steps.",
      color: "teal",
      locationType: LocationType.VIDEO,
      locationValue: "Google Meet",
      cancellationPolicy: "Please reschedule at least 12 hours in advance.",
      isActive: true,
      minNoticeMins: 60,
      maxFutureDays: 45,
      bufferBeforeMins: 10,
      bufferAfterMins: 10,
      scheduleId: schedule.id,
      bookingQuestions: {
        create: [
          {
            label: "What would you like to cover?",
            type: BookingQuestionType.LONG_TEXT,
            isRequired: true,
            order: 1,
          },
        ],
      },
    },
  });

  const strategySession = await prisma.eventType.create({
    data: {
      userId: host.id,
      title: "Strategy Session",
      slug: "strategy-session",
      durationMinutes: 60,
      description: "A deeper working session focused on practical scheduling and product decisions.",
      color: "clay",
      locationType: LocationType.CUSTOM,
      locationValue: "Zoom link sent after booking",
      cancellationPolicy: "24 hours notice preferred for changes or cancellations.",
      isActive: true,
      minNoticeMins: 120,
      maxFutureDays: 60,
      bufferBeforeMins: 15,
      bufferAfterMins: 15,
      dailyLimit: 3,
      weeklyLimit: 10,
      scheduleId: schedule.id,
      bookingQuestions: {
        create: [
          {
            label: "Which topics are most important?",
            type: BookingQuestionType.MULTI_SELECT,
            isRequired: true,
            options: ["Product", "Hiring", "Go-to-market"],
            order: 1,
          },
        ],
      },
    },
  });

  const upcomingDate = nextWeekday(3);
  const pastDate = daysFromToday(-7);
  const cancelledDate = nextWeekday(4);

  await prisma.booking.createMany({
    data: [
      {
        eventTypeId: introCall.id,
        hostId: host.id,
        inviteeName: "Ava Prospect",
        inviteeEmail: "ava@example.com",
        inviteeTimezone: "UTC",
        startTime: atUtc(upcomingDate, 10, 0),
        endTime: atUtc(upcomingDate, 10, 30),
        status: BookingStatus.CONFIRMED,
        publicToken: randomUUID(),
        answers: {
          "What would you like to cover?": "Onboarding and scheduling workflow",
        },
        notes: "Upcoming discovery call",
      },
      {
        eventTypeId: strategySession.id,
        hostId: host.id,
        inviteeName: "Leo Client",
        inviteeEmail: "leo@example.com",
        inviteeTimezone: "UTC",
        startTime: atUtc(pastDate, 14, 0),
        endTime: atUtc(pastDate, 15, 0),
        status: BookingStatus.CONFIRMED,
        publicToken: randomUUID(),
        answers: {
          "Which topics are most important?": ["Product", "Go-to-market"],
        },
        notes: "Completed strategy session",
      },
      {
        eventTypeId: introCall.id,
        hostId: host.id,
        inviteeName: "Mina Cancelled",
        inviteeEmail: "mina@example.com",
        inviteeTimezone: "UTC",
        startTime: atUtc(cancelledDate, 16, 0),
        endTime: atUtc(cancelledDate, 16, 30),
        status: BookingStatus.CANCELLED,
        publicToken: randomUUID(),
        answers: {
          "What would you like to cover?": "Cancelled before meeting",
        },
        notes: "Cancelled by invitee",
      },
    ],
  });

  console.log(JSON.stringify({
    hostUserId: host.id,
    scheduleId: schedule.id,
    eventTypeSlugs: [introCall.slug, strategySession.slug],
    seededBookings: 3,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
