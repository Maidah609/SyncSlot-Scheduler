import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import cookieParser from "cookie-parser";
import request, { type Response } from "supertest";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  BookingAuditAction,
  BookingAuditActorType,
  BookingStatus,
  LocationType,
  PrismaService,
} from "@syncslot/database";
import { DateTime } from "luxon";
import { AppModule } from "../dist/app.module";
import { AuthService } from "../dist/auth/auth.service";
import { GlobalExceptionFilter } from "../dist/common/filters/global-exception.filter";

type AppContext = {
  app: any;
  prisma: PrismaService;
  authService: AuthService;
};

type HostFixture = {
  host: {
    id: string;
    email: string;
    name: string;
    username: string;
    title: string;
    welcome: string;
    timezone: string;
    emailVerifiedAt: Date;
    onboardingCompletedAt: Date;
  };
  otherHost: {
    id: string;
    email: string;
    name: string;
    username: string;
    title: string;
    welcome: string;
    timezone: string;
    emailVerifiedAt: Date;
    onboardingCompletedAt: Date;
  };
  scheduleId: string;
  eventTypeOneId: string;
  eventTypeOneSlug: string;
  eventTypeTwoId: string;
  otherHostEventTypeId: string;
  bookings: {
    futureConfirmed: string;
    futureConfirmedToken: string;
    pastConfirmed: string;
    cancelled: string;
    cancelledToken: string;
    otherEventFuture: string;
    reschedulable: string;
    publicCancelableId: string;
    publicCancelableToken: string;
    publicReschedulableId: string;
    publicReschedulableToken: string;
    conflictingFuture: string;
    otherHostBookingId: string;
  };
  days: {
    past: string;
    future: string;
    futureTwo: string;
    futureThree: string;
    futureFour: string;
  };
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
    authService: app.get(AuthService),
  };
}

async function createHostFixture(prisma: PrismaService): Promise<HostFixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const verifiedAt = new Date();
  const onboardedAt = new Date();

  const host = await prisma.user.create({
    data: {
      email: `host-${suffix}@example.com`,
      name: "Host Owner",
      username: `host-owner-${suffix}`,
      timezone: "UTC",
      title: "Host Owner",
      welcome: "Welcome",
      emailVerifiedAt: verifiedAt,
      onboardingCompletedAt: onboardedAt,
    },
  });

  const otherHost = await prisma.user.create({
    data: {
      email: `other-host-${suffix}@example.com`,
      name: "Other Host",
      username: `other-host-${suffix}`,
      timezone: "UTC",
      title: "Other Host",
      welcome: "Welcome",
      emailVerifiedAt: verifiedAt,
      onboardingCompletedAt: onboardedAt,
    },
  });

  const today = DateTime.utc().startOf("day");
  const days = {
    past: today.minus({ days: 2 }).toISODate() as string,
    future: today.plus({ days: 3 }).toISODate() as string,
    futureTwo: today.plus({ days: 4 }).toISODate() as string,
    futureThree: today.plus({ days: 5 }).toISODate() as string,
    futureFour: today.plus({ days: 6 }).toISODate() as string,
  };

  const schedule = await prisma.schedule.create({
    data: {
      userId: host.id,
      name: "Host Schedule",
      timezone: "UTC",
      isDefault: true,
      dateOverrides: {
        create: [
          { date: new Date(`${days.past}T00:00:00.000Z`), isClosed: false, startTime: "09:00", endTime: "12:00" },
          { date: new Date(`${days.future}T00:00:00.000Z`), isClosed: false, startTime: "09:00", endTime: "12:00" },
          { date: new Date(`${days.futureTwo}T00:00:00.000Z`), isClosed: false, startTime: "09:00", endTime: "12:00" },
          { date: new Date(`${days.futureThree}T00:00:00.000Z`), isClosed: false, startTime: "09:00", endTime: "12:00" },
          { date: new Date(`${days.futureFour}T00:00:00.000Z`), isClosed: false, startTime: "09:00", endTime: "12:00" },
        ],
      },
    },
  });

  const otherSchedule = await prisma.schedule.create({
    data: {
      userId: otherHost.id,
      name: "Other Host Schedule",
      timezone: "UTC",
      isDefault: true,
      dateOverrides: {
        create: [
          { date: new Date(`${days.future}T00:00:00.000Z`), isClosed: false, startTime: "09:00", endTime: "12:00" },
        ],
      },
    },
  });

  const [eventTypeOne, eventTypeTwo, otherHostEventType] = await Promise.all([
    prisma.eventType.create({
      data: {
        userId: host.id,
        title: "Discovery Call",
        slug: `discovery-${suffix}`,
        durationMinutes: 60,
        locationType: LocationType.VIDEO,
        locationValue: "Zoom",
        isActive: true,
        minNoticeMins: 0,
        maxFutureDays: 30,
        bufferBeforeMins: 0,
        bufferAfterMins: 0,
        scheduleId: schedule.id,
      },
    }),
    prisma.eventType.create({
      data: {
        userId: host.id,
        title: "Strategy Session",
        slug: `strategy-${suffix}`,
        durationMinutes: 60,
        locationType: LocationType.VIDEO,
        locationValue: "Google Meet",
        isActive: true,
        minNoticeMins: 0,
        maxFutureDays: 30,
        bufferBeforeMins: 0,
        bufferAfterMins: 0,
        scheduleId: schedule.id,
      },
    }),
    prisma.eventType.create({
      data: {
        userId: otherHost.id,
        title: "Other Host Event",
        slug: `other-${suffix}`,
        durationMinutes: 60,
        locationType: LocationType.VIDEO,
        locationValue: "Zoom",
        isActive: true,
        minNoticeMins: 0,
        maxFutureDays: 30,
        bufferBeforeMins: 0,
        bufferAfterMins: 0,
        scheduleId: otherSchedule.id,
      },
    }),
  ]);

  const makeBooking = async (input: {
    eventTypeId: string;
    hostId: string;
    inviteeName: string;
    inviteeEmail: string;
    date: string;
    startHour: number;
    status: BookingStatus;
    publicToken: string;
    notes?: string | null;
    rescheduledFromId?: string;
  }) => prisma.booking.create({
    data: {
      eventTypeId: input.eventTypeId,
      hostId: input.hostId,
      inviteeName: input.inviteeName,
      inviteeEmail: input.inviteeEmail,
      inviteeTimezone: "UTC",
      startTime: new Date(`${input.date}T${String(input.startHour).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`${input.date}T${String(input.startHour + 1).padStart(2, "0")}:00:00.000Z`),
      status: input.status,
      publicToken: input.publicToken,
      answers: { topic: input.inviteeName },
      notes: input.notes ?? null,
      rescheduledFromId: input.rescheduledFromId,
    },
  });

  const futureConfirmedToken = `token-future-${suffix}`;
  const cancelledToken = `token-cancelled-${suffix}`;

  const futureConfirmed = await makeBooking({
    eventTypeId: eventTypeOne.id,
    hostId: host.id,
    inviteeName: "Alice Example",
    inviteeEmail: "alice@example.com",
    date: days.future,
    startHour: 9,
    status: BookingStatus.CONFIRMED,
    publicToken: futureConfirmedToken,
    notes: "Initial note",
  });
  const pastConfirmed = await makeBooking({
    eventTypeId: eventTypeOne.id,
    hostId: host.id,
    inviteeName: "Bob Past",
    inviteeEmail: "bob@example.com",
    date: days.past,
    startHour: 9,
    status: BookingStatus.CONFIRMED,
    publicToken: `token-past-${suffix}`,
  });
  const cancelled = await makeBooking({
    eventTypeId: eventTypeOne.id,
    hostId: host.id,
    inviteeName: "Cara Cancelled",
    inviteeEmail: "cara@example.com",
    date: days.future,
    startHour: 11,
    status: BookingStatus.CANCELLED,
    publicToken: cancelledToken,
  });
  const otherEventFuture = await makeBooking({
    eventTypeId: eventTypeTwo.id,
    hostId: host.id,
    inviteeName: "Dan Strategy",
    inviteeEmail: "dan@example.com",
    date: days.futureTwo,
    startHour: 9,
    status: BookingStatus.CONFIRMED,
    publicToken: `token-other-event-${suffix}`,
  });
  const reschedulable = await makeBooking({
    eventTypeId: eventTypeOne.id,
    hostId: host.id,
    inviteeName: "Eve Reschedule",
    inviteeEmail: "eve@example.com",
    date: days.future,
    startHour: 10,
    status: BookingStatus.CONFIRMED,
    publicToken: `token-reschedulable-${suffix}`,
  });
  const publicCancelable = await makeBooking({
    eventTypeId: eventTypeOne.id,
    hostId: host.id,
    inviteeName: "Frank Public Cancel",
    inviteeEmail: "frank@example.com",
    date: days.futureThree,
    startHour: 9,
    status: BookingStatus.CONFIRMED,
    publicToken: `token-public-cancel-${suffix}`,
  });
  const publicReschedulable = await makeBooking({
    eventTypeId: eventTypeOne.id,
    hostId: host.id,
    inviteeName: "Grace Public Reschedule",
    inviteeEmail: "grace@example.com",
    date: days.futureThree,
    startHour: 10,
    status: BookingStatus.CONFIRMED,
    publicToken: `token-public-reschedule-${suffix}`,
  });
  const conflictingFuture = await makeBooking({
    eventTypeId: eventTypeOne.id,
    hostId: host.id,
    inviteeName: "Henry Conflict",
    inviteeEmail: "henry@example.com",
    date: days.futureTwo,
    startHour: 10,
    status: BookingStatus.CONFIRMED,
    publicToken: `token-conflict-${suffix}`,
  });
  const otherHostBooking = await makeBooking({
    eventTypeId: otherHostEventType.id,
    hostId: otherHost.id,
    inviteeName: "Ivy Other Host",
    inviteeEmail: "ivy@example.com",
    date: days.future,
    startHour: 9,
    status: BookingStatus.CONFIRMED,
    publicToken: `token-other-host-${suffix}`,
  });

  return {
    host: {
      id: host.id,
      email: host.email,
      name: host.name,
      username: host.username,
      title: host.title,
      welcome: host.welcome,
      timezone: host.timezone,
      emailVerifiedAt: host.emailVerifiedAt as Date,
      onboardingCompletedAt: host.onboardingCompletedAt as Date,
    },
    otherHost: {
      id: otherHost.id,
      email: otherHost.email,
      name: otherHost.name,
      username: otherHost.username,
      title: otherHost.title,
      welcome: otherHost.welcome,
      timezone: otherHost.timezone,
      emailVerifiedAt: otherHost.emailVerifiedAt as Date,
      onboardingCompletedAt: otherHost.onboardingCompletedAt as Date,
    },
    scheduleId: schedule.id,
    eventTypeOneId: eventTypeOne.id,
    eventTypeOneSlug: eventTypeOne.slug,
    eventTypeTwoId: eventTypeTwo.id,
    otherHostEventTypeId: otherHostEventType.id,
    bookings: {
      futureConfirmed: futureConfirmed.id,
      futureConfirmedToken,
      pastConfirmed: pastConfirmed.id,
      cancelled: cancelled.id,
      cancelledToken,
      otherEventFuture: otherEventFuture.id,
      reschedulable: reschedulable.id,
      publicCancelableId: publicCancelable.id,
      publicCancelableToken: publicCancelable.publicToken,
      publicReschedulableId: publicReschedulable.id,
      publicReschedulableToken: publicReschedulable.publicToken,
      conflictingFuture: conflictingFuture.id,
      otherHostBookingId: otherHostBooking.id,
    },
    days,
  };
}

async function cleanupHostFixture(prisma: PrismaService, fixture: HostFixture) {
  await prisma.bookingAuditLog.deleteMany({
    where: {
      booking: {
        OR: [
          { hostId: fixture.host.id },
          { hostId: fixture.otherHost.id },
        ],
      },
    },
  });
  await prisma.booking.deleteMany({
    where: {
      OR: [
        { hostId: fixture.host.id },
        { hostId: fixture.otherHost.id },
      ],
    },
  });
  await prisma.eventType.deleteMany({
    where: {
      OR: [
        { userId: fixture.host.id },
        { userId: fixture.otherHost.id },
      ],
    },
  });
  await prisma.schedule.deleteMany({
    where: {
      OR: [
        { userId: fixture.host.id },
        { userId: fixture.otherHost.id },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: [fixture.host.id, fixture.otherHost.id] },
    },
  });
}

async function createAuthCookie(authService: AuthService, user: HostFixture["host"] | HostFixture["otherHost"]) {
  const session = await authService.loginWithUser(user);
  return `${authService.getCookieName()}=${session.sessionToken}`;
}

function assertNotFound(response: Response) {
  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Booking not found.");
}

function assertConflict(response: Response, message: string) {
  assert.equal(response.status, 409);
  assert.equal(response.body.message, message);
}

function countStatuses(responses: Response[]) {
  const counts = new Map<number, number>();

  for (const response of responses) {
    counts.set(response.status, (counts.get(response.status) ?? 0) + 1);
  }

  return counts;
}

test("GET /api/bookings filters upcoming bookings by status", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .get("/api/bookings")
      .set("Cookie", cookie)
      .query({ status: "upcoming" });

    assert.equal(response.status, 200);
    const ids = response.body.items.map((item: { id: string }) => item.id);
    assert.ok(ids.includes(fixture.bookings.futureConfirmed));
    assert.ok(ids.includes(fixture.bookings.otherEventFuture));
    assert.ok(ids.includes(fixture.bookings.reschedulable));
    assert.ok(ids.includes(fixture.bookings.conflictingFuture));
    assert.ok(!ids.includes(fixture.bookings.pastConfirmed));
    assert.ok(!ids.includes(fixture.bookings.cancelled));
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/bookings filters bookings by search text", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .get("/api/bookings")
      .set("Cookie", cookie)
      .query({ search: "Alice" });

    assert.equal(response.status, 200);
    assert.equal(response.body.items.length, 1);
    assert.equal(response.body.items[0].id, fixture.bookings.futureConfirmed);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/bookings filters bookings by from/to date range", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .get("/api/bookings")
      .set("Cookie", cookie)
      .query({
        from: fixture.days.futureTwo,
        to: fixture.days.futureThree,
      });

    assert.equal(response.status, 200);
    const ids = response.body.items.map((item: { id: string }) => item.id);
    assert.deepEqual(
      new Set(ids),
      new Set([
        fixture.bookings.otherEventFuture,
        fixture.bookings.conflictingFuture,
        fixture.bookings.publicCancelableId,
        fixture.bookings.publicReschedulableId,
      ]),
    );
    assert.ok(ids.includes(fixture.bookings.futureConfirmed) === false);
    assert.ok(ids.includes(fixture.bookings.pastConfirmed) === false);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/bookings filters bookings by eventTypeId", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .get("/api/bookings")
      .set("Cookie", cookie)
      .query({ eventTypeId: fixture.eventTypeTwoId });

    assert.equal(response.status, 200);
    assert.equal(response.body.items.length, 1);
    assert.equal(response.body.items[0].id, fixture.bookings.otherEventFuture);
    assert.equal(response.body.items[0].eventType.id, fixture.eventTypeTwoId);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/bookings paginates booking results", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .get("/api/bookings")
      .set("Cookie", cookie)
      .query({ page: 1 });

    assert.equal(response.status, 200);
    assert.equal(response.body.page, 1);
    assert.equal(response.body.pageSize, 20);
    assert.equal(response.body.total, 8);
    assert.equal(response.body.totalPages, 1);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/bookings/:id is ownership scoped for the host", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);

    const own = await request(app.getHttpServer())
      .get(`/api/bookings/${fixture.bookings.futureConfirmed}`)
      .set("Cookie", cookie);
    assert.equal(own.status, 200);
    assert.equal(own.body.booking.id, fixture.bookings.futureConfirmed);

    const foreign = await request(app.getHttpServer())
      .get(`/api/bookings/${fixture.bookings.otherHostBookingId}`)
      .set("Cookie", cookie);
    assertNotFound(foreign);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("PATCH /api/bookings/:id/notes updates host notes", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .patch(`/api/bookings/${fixture.bookings.futureConfirmed}/notes`)
      .set("Cookie", cookie)
      .send({ notes: "Updated host note" });

    assert.equal(response.status, 200);
    assert.equal(response.body.booking.notes, "Updated host note");

    const persisted = await prisma.booking.findUniqueOrThrow({
      where: { id: fixture.bookings.futureConfirmed },
      select: { notes: true },
    });
    assert.equal(persisted.notes, "Updated host note");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("PATCH /api/bookings/:id/notes does not let a different host edit another host booking", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.otherHost);
    const response = await request(app.getHttpServer())
      .patch(`/api/bookings/${fixture.bookings.futureConfirmed}/notes`)
      .set("Cookie", cookie)
      .send({ notes: "Intrusion attempt" });

    assertNotFound(response);

    const persisted = await prisma.booking.findUniqueOrThrow({
      where: { id: fixture.bookings.futureConfirmed },
      select: { notes: true },
    });
    assert.equal(persisted.notes, "Initial note");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/cancel cancels the booking and writes a host audit log", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.futureConfirmed}/cancel`)
      .set("Cookie", cookie)
      .send({ reason: "Host conflict", message: "Need to cancel." });

    assert.equal(response.status, 200);
    assert.equal(response.body.booking.status, BookingStatus.CANCELLED);

    const auditLog = await prisma.bookingAuditLog.findFirstOrThrow({
      where: {
        bookingId: fixture.bookings.futureConfirmed,
        action: BookingAuditAction.CANCELLED,
      },
    });
    assert.equal(auditLog.actorType, BookingAuditActorType.HOST);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/cancel does not let a different host cancel another host booking", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.otherHost);
    const beforeLogs = await prisma.bookingAuditLog.count({
      where: { bookingId: fixture.bookings.futureConfirmed },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.futureConfirmed}/cancel`)
      .set("Cookie", cookie)
      .send({ reason: "Unauthorized cancel" });

    assertNotFound(response);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: fixture.bookings.futureConfirmed },
      select: { status: true },
    });
    assert.equal(booking.status, BookingStatus.CONFIRMED);

    const afterLogs = await prisma.bookingAuditLog.count({
      where: { bookingId: fixture.bookings.futureConfirmed },
    });
    assert.equal(afterLogs, beforeLogs);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/cancel rejects an already cancelled booking with 409", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.cancelled}/cancel`)
      .set("Cookie", cookie)
      .send({ reason: "Again" });

    assertConflict(response, "Only confirmed bookings can be cancelled.");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/cancel rejects a booking already marked RESCHEDULED with 409 and no duplicate cancel audit", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);

    const reschedule = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.reschedulable}/reschedule`)
      .set("Cookie", cookie)
      .send({ startTime: `${fixture.days.futureTwo}T11:00:00Z`, reason: "Move first" });
    assert.equal(reschedule.status, 200);

    const cancelAttempt = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.reschedulable}/cancel`)
      .set("Cookie", cookie)
      .send({ reason: "Try cancelling rescheduled source" });

    assertConflict(cancelAttempt, "Only confirmed bookings can be cancelled.");

    const cancelLogs = await prisma.bookingAuditLog.findMany({
      where: {
        bookingId: fixture.bookings.reschedulable,
        action: BookingAuditAction.CANCELLED,
      },
    });
    assert.equal(cancelLogs.length, 0);

    const rescheduleLogs = await prisma.bookingAuditLog.findMany({
      where: {
        bookingId: fixture.bookings.reschedulable,
        action: BookingAuditAction.RESCHEDULED,
      },
    });
    assert.equal(rescheduleLogs.length, 1);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/reschedule creates a new booking row with lineage and reschedule audit logs", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const targetStart = `${fixture.days.futureTwo}T11:00:00Z`;

    const response = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.reschedulable}/reschedule`)
      .set("Cookie", cookie)
      .send({ startTime: targetStart, reason: "Host moved it" });

    assert.equal(response.status, 200);
    assert.equal(response.body.previousBooking.status, BookingStatus.RESCHEDULED);
    assert.equal(response.body.newBooking.status, BookingStatus.CONFIRMED);

    const newBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: response.body.newBooking.id },
      select: {
        id: true,
        rescheduledFromId: true,
        publicToken: true,
        startTime: true,
      },
    });
    assert.equal(newBooking.rescheduledFromId, fixture.bookings.reschedulable);
    assert.equal(newBooking.startTime.toISOString(), `${fixture.days.futureTwo}T11:00:00.000Z`);

    const previous = await prisma.booking.findUniqueOrThrow({
      where: { id: fixture.bookings.reschedulable },
      select: { status: true },
    });
    assert.equal(previous.status, BookingStatus.RESCHEDULED);

    const logs = await prisma.bookingAuditLog.findMany({
      where: {
        bookingId: { in: [fixture.bookings.reschedulable, newBooking.id] },
        action: BookingAuditAction.RESCHEDULED,
      },
    });
    assert.equal(logs.length, 2);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/reschedule rejects a conflicting slot with 409", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const targetStart = `${fixture.days.futureTwo}T10:00:00Z`;

    const response = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.reschedulable}/reschedule`)
      .set("Cookie", cookie)
      .send({ startTime: targetStart });

    assertConflict(response, "This slot is no longer available. Please choose another time.");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/reschedule does not let a different host reschedule another host booking", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.otherHost);
    const bookingCountBefore = await prisma.booking.count({
      where: { hostId: fixture.host.id },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.reschedulable}/reschedule`)
      .set("Cookie", cookie)
      .send({ startTime: `${fixture.days.futureTwo}T11:00:00Z` });

    assertNotFound(response);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: fixture.bookings.reschedulable },
      select: { status: true },
    });
    assert.equal(booking.status, BookingStatus.CONFIRMED);

    const bookingCountAfter = await prisma.booking.count({
      where: { hostId: fixture.host.id },
    });
    assert.equal(bookingCountAfter, bookingCountBefore);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/reschedule rejects a cancelled booking with 409", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.cancelled}/reschedule`)
      .set("Cookie", cookie)
      .send({ startTime: `${fixture.days.futureTwo}T11:00:00Z` });

    assertConflict(response, "Only confirmed bookings can be rescheduled.");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/bookings/:id/reschedule rejects an already rescheduled booking with 409", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const targetStart = `${fixture.days.futureTwo}T11:00:00Z`;

    const first = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.reschedulable}/reschedule`)
      .set("Cookie", cookie)
      .send({ startTime: targetStart });
    assert.equal(first.status, 200);

    const second = await request(app.getHttpServer())
      .post(`/api/bookings/${fixture.bookings.reschedulable}/reschedule`)
      .set("Cookie", cookie)
      .send({ startTime: `${fixture.days.futureFour}T11:00:00Z` });

    assertConflict(second, "Only confirmed bookings can be rescheduled.");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/public/bookings/:token returns the invitee-facing booking lookup", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const response = await request(app.getHttpServer())
      .get(`/api/public/bookings/${fixture.bookings.publicCancelableToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.booking.publicToken, fixture.bookings.publicCancelableToken);
    assert.equal(response.body.host.username, fixture.host.username);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/public/bookings/:token returns 404 for an unknown token", async () => {
  const { app } = await createApp();

  try {
    const response = await request(app.getHttpServer())
      .get("/api/public/bookings/unknown-token");

    assertNotFound(response);
  } finally {
    await app.close();
  }
});

test("POST /api/public/bookings/:token/cancel cancels the invitee booking", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const response = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.publicCancelableToken}/cancel`)
      .send({ reason: "No longer needed" });

    assert.equal(response.status, 200);
    assert.equal(response.body.booking.status, BookingStatus.CANCELLED);

    const auditLog = await prisma.bookingAuditLog.findFirstOrThrow({
      where: {
        booking: {
          publicToken: fixture.bookings.publicCancelableToken,
        },
        action: BookingAuditAction.CANCELLED,
      },
    });
    assert.equal(auditLog.actorType, BookingAuditActorType.INVITEE);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/public/bookings/:token/cancel returns 404 for an unknown token", async () => {
  const { app } = await createApp();

  try {
    const response = await request(app.getHttpServer())
      .post("/api/public/bookings/unknown-token/cancel")
      .send({ reason: "No-op" });

    assertNotFound(response);
  } finally {
    await app.close();
  }
});

test("POST /api/public/bookings/:token/cancel rejects an already cancelled booking with 409", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const response = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.cancelledToken}/cancel`)
      .send({ reason: "Again" });

    assertConflict(response, "Only confirmed bookings can be cancelled.");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/public/bookings/:token/cancel rejects the original token of a rescheduled booking with 409 and no duplicate cancel audit", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const reschedule = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.publicReschedulableToken}/reschedule`)
      .send({ startTime: `${fixture.days.futureFour}T09:00:00Z`, reason: "Invitee moved it first" });
    assert.equal(reschedule.status, 200);

    const cancelAttempt = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.publicReschedulableToken}/cancel`)
      .send({ reason: "Try cancelling rescheduled original token" });

    assertConflict(cancelAttempt, "Only confirmed bookings can be cancelled.");

    const originalBooking = await prisma.booking.findUniqueOrThrow({
      where: { publicToken: fixture.bookings.publicReschedulableToken },
      select: { id: true, status: true },
    });
    assert.equal(originalBooking.status, BookingStatus.RESCHEDULED);

    const cancelLogs = await prisma.bookingAuditLog.findMany({
      where: {
        bookingId: originalBooking.id,
        action: BookingAuditAction.CANCELLED,
      },
    });
    assert.equal(cancelLogs.length, 0);

    const rescheduleLogs = await prisma.bookingAuditLog.findMany({
      where: {
        bookingId: originalBooking.id,
        action: BookingAuditAction.RESCHEDULED,
      },
    });
    assert.equal(rescheduleLogs.length, 1);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/public/bookings/:token/reschedule creates a replacement booking from the public token flow", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const targetStart = `${fixture.days.futureFour}T09:00:00Z`;
    const response = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.publicReschedulableToken}/reschedule`)
      .send({ startTime: targetStart, reason: "Invitee moved it" });

    assert.equal(response.status, 200);
    assert.equal(response.body.previousBooking.status, BookingStatus.RESCHEDULED);
    assert.equal(response.body.newBooking.status, BookingStatus.CONFIRMED);

    const newBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: response.body.newBooking.id },
      select: { rescheduledFromId: true, publicToken: true },
    });
    assert.ok(newBooking.publicToken);
    assert.equal(newBooking.rescheduledFromId, response.body.previousBooking.id);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/public/bookings/:token/reschedule rejects a conflicting slot with 409", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const response = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.publicReschedulableToken}/reschedule`)
      .send({ startTime: `${fixture.days.futureTwo}T10:00:00Z` });

    assertConflict(response, "This slot is no longer available. Please choose another time.");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/public/bookings/:token/reschedule returns 404 for an unknown token", async () => {
  const { app } = await createApp();

  try {
    const response = await request(app.getHttpServer())
      .post("/api/public/bookings/unknown-token/reschedule")
      .send({ startTime: "2026-07-10T09:00:00Z" });

    assertNotFound(response);
  } finally {
    await app.close();
  }
});

test("POST /api/public/bookings/:token/reschedule rejects a cancelled booking with 409", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const response = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.cancelledToken}/reschedule`)
      .send({ startTime: `${fixture.days.futureTwo}T11:00:00Z` });

    assertConflict(response, "Only confirmed bookings can be rescheduled.");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("POST /api/public/bookings/:token/reschedule rejects an already rescheduled booking with 409", async () => {
  const { app, prisma } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const first = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.publicReschedulableToken}/reschedule`)
      .send({ startTime: `${fixture.days.futureFour}T09:00:00Z` });
    assert.equal(first.status, 200);

    const second = await request(app.getHttpServer())
      .post(`/api/public/bookings/${fixture.bookings.publicReschedulableToken}/reschedule`)
      .send({ startTime: `${fixture.days.futureFour}T10:00:00Z` });

    assertConflict(second, "Only confirmed bookings can be rescheduled.");
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/bookings/export.csv returns host-scoped CSV rows and excludes another host", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .get("/api/bookings/export.csv")
      .set("Cookie", cookie);

    assert.equal(response.status, 200);
    assert.match(response.headers["content-type"], /text\/csv/);

    const lines = response.text.trim().split("\n");
    assert.equal(lines[0], "\"id\",\"publicToken\",\"eventTypeTitle\",\"eventTypeSlug\",\"inviteeName\",\"inviteeEmail\",\"inviteeTimezone\",\"startTime\",\"endTime\",\"status\",\"notes\"");
    assert.match(response.text, new RegExp(fixture.bookings.futureConfirmed));
    assert.match(response.text, /"Alice Example"/);
    assert.match(response.text, new RegExp(fixture.bookings.futureConfirmedToken));
    assert.doesNotMatch(response.text, /"Ivy Other Host"/);
    assert.doesNotMatch(response.text, new RegExp(fixture.bookings.otherHostBookingId));
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("GET /api/bookings/export.csv does not leak another host bookings when filtered by another host eventTypeId", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const response = await request(app.getHttpServer())
      .get("/api/bookings/export.csv")
      .set("Cookie", cookie)
      .query({ eventTypeId: fixture.otherHostEventTypeId });

    assert.equal(response.status, 200);
    const lines = response.text.trim().split("\n");
    assert.equal(lines.length, 1);
    assert.doesNotMatch(response.text, /"Ivy Other Host"/);
    assert.doesNotMatch(response.text, new RegExp(fixture.bookings.otherHostBookingId));
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});

test("host reschedule and public booking racing for the same slot allow exactly one winner", async () => {
  const { app, prisma, authService } = await createApp();
  const fixture = await createHostFixture(prisma);

  try {
    const cookie = await createAuthCookie(authService, fixture.host);
    const targetStart = `${fixture.days.futureTwo}T11:00:00Z`;

    const [hostResponse, publicResponse] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/bookings/${fixture.bookings.reschedulable}/reschedule`)
        .set("Cookie", cookie)
        .send({ startTime: targetStart, reason: "Host race" }),
      request(app.getHttpServer())
        .post(`/api/public/${fixture.host.username}/${fixture.eventTypeOneSlug}/book`)
        .send({
          inviteeName: "Race Invitee",
          inviteeEmail: "race@example.com",
          inviteeTimezone: "UTC",
          startTime: targetStart,
          answers: {},
        }),
    ]);

    const counts = countStatuses([hostResponse, publicResponse]);
    assert.equal((counts.get(200) ?? 0) + (counts.get(201) ?? 0), 1);
    assert.equal(counts.get(409) ?? 0, 1);

    const winnerIds = [
      hostResponse.status === 200 ? hostResponse.body.newBooking.id : null,
      publicResponse.status === 201 ? publicResponse.body.booking.id : null,
    ].filter(Boolean) as string[];

    assert.equal(winnerIds.length, 1);

    const bookingsAtSlot = await prisma.booking.findMany({
      where: {
        hostId: fixture.host.id,
        startTime: new Date(`${fixture.days.futureTwo}T11:00:00.000Z`),
        endTime: new Date(`${fixture.days.futureTwo}T12:00:00.000Z`),
        status: BookingStatus.CONFIRMED,
      },
      select: { id: true },
    });
    assert.equal(bookingsAtSlot.length, 1);
    assert.equal(bookingsAtSlot[0].id, winnerIds[0]);
  } finally {
    await cleanupHostFixture(prisma, fixture);
    await app.close();
  }
});
