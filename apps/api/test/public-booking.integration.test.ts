import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import cookieParser from "cookie-parser";
import request, { type Response } from "supertest";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  BookingAuditAction,
  BookingQuestionType,
  BookingStatus,
  LocationType,
  Prisma,
  PrismaService,
} from "@syncslot/database";
import { DateTime } from "luxon";
import { AppModule } from "../dist/app.module";
import { GlobalExceptionFilter } from "../dist/common/filters/global-exception.filter";

type AppContext = {
  app: Awaited<ReturnType<typeof Test.createTestingModule>> extends never ? never : any;
  prisma: PrismaService;
};

type FixtureOptions = {
  daysFromNow?: number;
  visible?: boolean;
  active?: boolean;
  usernamePrefix?: string;
  title?: string;
  durationMinutes?: number;
  locationValue?: string;
  dailyLimit?: number | null;
  weeklyLimit?: number | null;
  overrideStartTime?: string;
  overrideEndTime?: string;
  questions?: Array<{
    label: string;
    type: BookingQuestionType;
    isRequired: boolean;
    order: number;
    options?: string[];
  }>;
};

type PublicFixture = {
  bookingDate: string;
  user: { id: string; username: string; name: string };
  schedule: { id: string };
  eventType: { id: string; slug: string; durationMinutes: number };
  questionIds: string[];
};

async function createApp(): Promise<AppContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix("api");
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
  };
}

async function createPublicFixture(prisma: PrismaService, options: FixtureOptions = {}): Promise<PublicFixture> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const suffix = `${timestamp}-${random}`;
  const bookingDate = DateTime.utc().plus({ days: options.daysFromNow ?? 2 }).toISODate();
  assert.ok(bookingDate);

  const visible = options.visible ?? true;
  const user = await prisma.user.create({
    data: {
      email: `public-booking-${suffix}@example.com`,
      emailVerifiedAt: visible ? new Date() : null,
      name: options.title ?? "Public Booking Host",
      username: `${options.usernamePrefix ?? "public-booking"}-${suffix}`,
      timezone: "UTC",
      onboardingCompletedAt: visible ? new Date() : null,
      title: "Integration Test Host",
      welcome: "Book a slot for the integration test.",
    },
    select: {
      id: true,
      username: true,
      name: true,
    },
  });

  const schedule = await prisma.schedule.create({
    data: {
      userId: user.id,
      name: "Integration Test Schedule",
      timezone: "UTC",
      isDefault: true,
      dateOverrides: {
        create: {
          date: new Date(`${bookingDate}T00:00:00.000Z`),
          isClosed: false,
          startTime: options.overrideStartTime ?? "09:00",
          endTime: options.overrideEndTime ?? "10:00",
        },
      },
    },
    select: { id: true },
  });

  const eventType = await prisma.eventType.create({
    data: {
      userId: user.id,
      title: "Integration Test Event",
      slug: `concurrency-test-${suffix}`,
      durationMinutes: options.durationMinutes ?? 60,
      description: "Used by the integration test.",
      locationType: LocationType.VIDEO,
      locationValue: options.locationValue ?? "Zoom",
      isActive: options.active ?? true,
      minNoticeMins: 0,
      maxFutureDays: 14,
      bufferBeforeMins: 0,
      bufferAfterMins: 0,
      dailyLimit: options.dailyLimit ?? null,
      weeklyLimit: options.weeklyLimit ?? null,
      scheduleId: schedule.id,
      bookingQuestions: {
        create: options.questions ?? [
          {
            label: "What should we cover?",
            type: BookingQuestionType.LONG_TEXT,
            isRequired: true,
            order: 0,
          },
        ],
      },
    },
    select: {
      id: true,
      slug: true,
      durationMinutes: true,
      bookingQuestions: {
        orderBy: { order: "asc" },
        select: { id: true },
      },
    },
  });

  return {
    bookingDate,
    user,
    schedule,
    eventType: {
      id: eventType.id,
      slug: eventType.slug,
      durationMinutes: eventType.durationMinutes,
    },
    questionIds: eventType.bookingQuestions.map((question) => question.id),
  };
}

async function cleanupFixture(prisma: PrismaService, fixture: PublicFixture) {
  await prisma.bookingAuditLog.deleteMany({
    where: {
      booking: {
        eventTypeId: fixture.eventType.id,
      },
    },
  });
  await prisma.booking.deleteMany({
    where: { eventTypeId: fixture.eventType.id },
  });
  await prisma.eventType.delete({
    where: { id: fixture.eventType.id },
  });
  await prisma.schedule.delete({
    where: { id: fixture.schedule.id },
  });
  await prisma.user.delete({
    where: { id: fixture.user.id },
  });
}

async function getSlots(
  app: AppContext["app"],
  fixture: PublicFixture,
  timezone = "UTC",
) {
  return request(app.getHttpServer())
    .get(`/api/public/${fixture.user.username}/${fixture.eventType.slug}/slots`)
    .query({ date: fixture.bookingDate, tz: timezone });
}

async function createBookingRequest(
  app: AppContext["app"],
  fixture: PublicFixture,
  payload: {
    inviteeName?: string;
    inviteeEmail?: string;
    inviteeTimezone?: string;
    startTime: string;
    answers?: Record<string, unknown>;
    notes?: string;
  },
) {
  return request(app.getHttpServer())
    .post(`/api/public/${fixture.user.username}/${fixture.eventType.slug}/book`)
    .send({
      inviteeName: payload.inviteeName ?? "Invitee",
      inviteeEmail: payload.inviteeEmail ?? `invitee-${Date.now()}@example.com`,
      inviteeTimezone: payload.inviteeTimezone ?? "UTC",
      startTime: payload.startTime,
      answers: payload.answers ?? {},
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    });
}

function assertBadRequestWithMessage(response: Response, message: string) {
  assert.equal(response.status, 400);
  assert.equal(response.body.statusCode, 400);
  assert.equal(response.body.message, message);
}

test("GET /api/public/:username/:eventSlug returns 404 for an unknown username", async () => {
  const { app } = await createApp();

  try {
    const response = await request(app.getHttpServer()).get("/api/public/missing-user/missing-event");
    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Event type not found.");
  } finally {
    await app.close();
  }
});

test("GET /api/public/:username/:eventSlug returns 404 for an inactive event type", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma, { active: false });

  try {
    const response = await request(app.getHttpServer())
      .get(`/api/public/${fixture.user.username}/${fixture.eventType.slug}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Event type not found.");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/public/:username/:eventSlug returns 404 for an unknown slug on a valid public host", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma);

  try {
    const response = await request(app.getHttpServer())
      .get(`/api/public/${fixture.user.username}/missing-slug`);

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Event type not found.");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/public/:username/:eventSlug applies the same verified-email and onboarding visibility gate", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma, { visible: false });

  try {
    const response = await request(app.getHttpServer())
      .get(`/api/public/${fixture.user.username}/${fixture.eventType.slug}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Event type not found.");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /book rejects a missing answer for a required question with a question-specific 400", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma);

  try {
    const slotsResponse = await getSlots(app, fixture);
    const slotStart = slotsResponse.body.slots[0].start as string;

    const response = await createBookingRequest(app, fixture, {
      startTime: slotStart,
      answers: {},
    });

    assertBadRequestWithMessage(response, "Answer required for question: What should we cover?");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /book rejects an answer outside configured SINGLE_SELECT options with a question-specific 400", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma, {
    questions: [
      {
        label: "Meeting format",
        type: BookingQuestionType.SINGLE_SELECT,
        isRequired: true,
        order: 0,
        options: ["Intro", "Deep dive"],
      },
    ],
  });

  try {
    const slotsResponse = await getSlots(app, fixture);
    const slotStart = slotsResponse.body.slots[0].start as string;

    const response = await createBookingRequest(app, fixture, {
      startTime: slotStart,
      answers: {
        [fixture.questionIds[0]]: "Invalid option",
      },
    });

    assertBadRequestWithMessage(response, "Answer for question Meeting format must be one of the configured options.");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /book rejects an array for a text question with a question-specific 400", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma, {
    questions: [
      {
        label: "Describe your goal",
        type: BookingQuestionType.LONG_TEXT,
        isRequired: true,
        order: 0,
      },
    ],
  });

  try {
    const slotsResponse = await getSlots(app, fixture);
    const slotStart = slotsResponse.body.slots[0].start as string;

    const response = await createBookingRequest(app, fixture, {
      startTime: slotStart,
      answers: {
        [fixture.questionIds[0]]: ["wrong", "type"],
      },
    });

    assertBadRequestWithMessage(response, "Answer for question Describe your goal must be a string.");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /book rejects a string for a MULTI_SELECT question with a question-specific 400", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma, {
    questions: [
      {
        label: "Topics to cover",
        type: BookingQuestionType.MULTI_SELECT,
        isRequired: true,
        order: 0,
        options: ["Roadmap", "Hiring", "Metrics"],
      },
    ],
  });

  try {
    const slotsResponse = await getSlots(app, fixture);
    const slotStart = slotsResponse.body.slots[0].start as string;

    const response = await createBookingRequest(app, fixture, {
      startTime: slotStart,
      answers: {
        [fixture.questionIds[0]]: "Roadmap",
      },
    });

    assertBadRequestWithMessage(response, "Answer for question Topics to cover must be an array of configured options.");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /book does not convert an unrelated transaction failure into 409", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma);
  const originalWithTransaction = prisma.withTransaction.bind(prisma);

  try {
    const slotsResponse = await getSlots(app, fixture);
    const slotStart = slotsResponse.body.slots[0].start as string;

    prisma.withTransaction = (async () => {
      throw new Prisma.PrismaClientKnownRequestError(
        "Forced non-conflict transaction failure.",
        {
          code: "P2034",
          clientVersion: "test",
        },
      );
    }) as typeof prisma.withTransaction;

    const response = await createBookingRequest(app, fixture, {
      startTime: slotStart,
      answers: {
        [fixture.questionIds[0]]: "Still available",
      },
    });

    assert.equal(response.status, 500);
    assert.notEqual(response.body.statusCode, 409);
    assert.equal(response.body.message, "Forced non-conflict transaction failure.");
  } finally {
    prisma.withTransaction = originalWithTransaction;
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /book re-checks dailyLimit inside the transaction and rejects a stale slot with 409", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma, {
    durationMinutes: 30,
    dailyLimit: 1,
    overrideStartTime: "09:00",
    overrideEndTime: "11:00",
  });

  try {
    const slotsResponse = await getSlots(app, fixture);
    assert.equal(slotsResponse.status, 200);
    assert.ok(slotsResponse.body.slots.length >= 2);

    const staleSlotStart = slotsResponse.body.slots[1].start as string;
    await prisma.booking.create({
      data: {
        eventTypeId: fixture.eventType.id,
        hostId: fixture.user.id,
        inviteeName: "Existing Invitee",
        inviteeEmail: "existing@example.com",
        inviteeTimezone: "UTC",
        startTime: new Date(slotsResponse.body.slots[0].startUtc),
        endTime: new Date(slotsResponse.body.slots[0].endUtc),
        status: BookingStatus.CONFIRMED,
        publicToken: `seed-${Date.now()}`,
        answers: {
          [fixture.questionIds[0]]: "Existing booking",
        },
      },
    });

    const response = await createBookingRequest(app, fixture, {
      startTime: staleSlotStart,
      answers: {
        [fixture.questionIds[0]]: "Should fail because of the cap",
      },
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.message, "This slot is no longer available. Please choose another time.");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /book re-checks weeklyLimit inside the transaction and rejects a slot on a different day in the same week", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma, {
    durationMinutes: 30,
    weeklyLimit: 1,
    overrideStartTime: "09:00",
    overrideEndTime: "11:00",
  });

  try {
    const firstDate = DateTime.utc().plus({ days: 7 }).startOf("week").plus({ days: 1 }).toISODate();
    const secondDate = DateTime.utc().plus({ days: 7 }).startOf("week").plus({ days: 2 }).toISODate();
    assert.ok(firstDate);
    assert.ok(secondDate);

    await prisma.dateOverride.createMany({
      data: [
        {
          scheduleId: fixture.schedule.id,
          date: new Date(`${firstDate}T00:00:00.000Z`),
          isClosed: false,
          startTime: "09:00",
          endTime: "11:00",
        },
        {
          scheduleId: fixture.schedule.id,
          date: new Date(`${secondDate}T00:00:00.000Z`),
          isClosed: false,
          startTime: "09:00",
          endTime: "11:00",
        },
      ],
    });

    const firstDaySlots = await request(app.getHttpServer())
      .get(`/api/public/${fixture.user.username}/${fixture.eventType.slug}/slots`)
      .query({ date: firstDate, tz: "UTC" });
    assert.equal(firstDaySlots.status, 200);
    assert.ok(firstDaySlots.body.slots.length >= 1);

    await prisma.booking.create({
      data: {
        eventTypeId: fixture.eventType.id,
        hostId: fixture.user.id,
        inviteeName: "Existing Weekly Invitee",
        inviteeEmail: "existing-weekly@example.com",
        inviteeTimezone: "UTC",
        startTime: new Date(firstDaySlots.body.slots[0].startUtc),
        endTime: new Date(firstDaySlots.body.slots[0].endUtc),
        status: BookingStatus.CONFIRMED,
        publicToken: `seed-weekly-${Date.now()}`,
        answers: {
          [fixture.questionIds[0]]: "Existing weekly booking",
        },
      },
    });

    const secondDaySlots = await request(app.getHttpServer())
      .get(`/api/public/${fixture.user.username}/${fixture.eventType.slug}/slots`)
      .query({ date: secondDate, tz: "UTC" });

    assert.equal(secondDaySlots.status, 200);
    assert.equal(secondDaySlots.body.slots.length, 0);

    const response = await createBookingRequest(app, fixture, {
      startTime: `${secondDate}T09:00:00Z`,
      answers: {
        [fixture.questionIds[0]]: "Should fail because of the weekly cap",
      },
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.message, "This slot is no longer available. Please choose another time.");
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("public booking flow only allows one of five concurrent requests to claim the same slot across three rounds", async () => {
  const { app, prisma } = await createApp();

  try {
    for (let round = 0; round < 3; round += 1) {
      const fixture = await createPublicFixture(prisma, {
        daysFromNow: round + 2,
      });

      try {
        const slotsResponse = await getSlots(app, fixture);
        assert.equal(slotsResponse.status, 200);
        assert.equal(slotsResponse.body.slots.length, 1);

        const slotStart = slotsResponse.body.slots[0].start as string;
        const responses = await Promise.all(
          Array.from({ length: 5 }, (_, index) =>
            createBookingRequest(app, fixture, {
              inviteeName: `Invitee ${index + 1}`,
              inviteeEmail: `invitee-${round}-${index}@example.com`,
              startTime: slotStart,
              answers: {
                [fixture.questionIds[0]]: `Concurrency request ${index + 1}`,
              },
            }),
          ),
        );

        const statusCounts = countStatuses(responses);
        assert.equal(statusCounts.get(201), 1);
        assert.equal(statusCounts.get(409), 4);

        const persistedBookings = await prisma.booking.findMany({
          where: { eventTypeId: fixture.eventType.id },
        });
        assert.equal(persistedBookings.length, 1);

        const auditLogs = await prisma.bookingAuditLog.findMany({
          where: {
            bookingId: persistedBookings[0].id,
            action: BookingAuditAction.CREATED,
          },
        });
        assert.equal(auditLogs.length, 1);
      } finally {
        await cleanupFixture(prisma, fixture);
      }
    }
  } finally {
    await app.close();
  }
});

test("dailyLimit allows only one of five concurrent requests across different slots on the same day", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createPublicFixture(prisma, {
    durationMinutes: 30,
    dailyLimit: 1,
    overrideStartTime: "09:00",
    overrideEndTime: "12:00",
  });

  try {
    const slotsResponse = await getSlots(app, fixture);
    assert.equal(slotsResponse.status, 200);
    assert.ok(slotsResponse.body.slots.length >= 5);

    const responses = await Promise.all(
      slotsResponse.body.slots.slice(0, 5).map((slot: { start: string }, index: number) =>
        createBookingRequest(app, fixture, {
          inviteeName: `Cap Invitee ${index + 1}`,
          inviteeEmail: `cap-${index}@example.com`,
          startTime: slot.start,
          answers: {
            [fixture.questionIds[0]]: `Cap test ${index + 1}`,
          },
        }),
      ),
    );

    const statusCounts = countStatuses(responses);
    assert.equal(statusCounts.get(201), 1);
    assert.equal(statusCounts.get(409), 4);

    const persistedBookings = await prisma.booking.findMany({
      where: { eventTypeId: fixture.eventType.id },
    });
    assert.equal(persistedBookings.length, 1);
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

function countStatuses(responses: Response[]) {
  const counts = new Map<number, number>();

  for (const response of responses) {
    counts.set(response.status, (counts.get(response.status) ?? 0) + 1);
  }

  return counts;
}
