import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingAuditAction,
  BookingAuditActorType,
  BookingStatus,
  Prisma,
  PrismaService,
} from "@syncslot/database";
import { computeAvailableSlots } from "@syncslot/slot-engine";
import { DateTime } from "luxon";
import { NotificationsService } from "../notifications/notifications.service";
import { BookingListQueryDto } from "./dto/booking-list-query.dto";
import { CancelBookingDto } from "./dto/cancel-booking.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";
import { UpdateBookingNotesDto } from "./dto/update-booking-notes.dto";

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    eventType: {
      include: {
        schedule: {
          include: {
            availabilityRules: true;
            dateOverrides: true;
          };
        };
      };
    };
    host: {
      select: {
        id: true;
        username: true;
        name: true;
        email: true;
        title: true;
        welcome: true;
        timezone: true;
      };
    };
    auditLogs: {
      orderBy: { createdAt: "asc" };
      include: {
        actorUser: {
          select: {
            id: true;
            name: true;
            username: true;
          };
        };
      };
    };
    rescheduledFrom: {
      select: {
        id: true;
        publicToken: true;
        startTime: true;
        endTime: true;
        status: true;
      };
    };
    rescheduledTo: {
      select: {
        id: true;
        publicToken: true;
        startTime: true;
        endTime: true;
        status: true;
      };
    };
  };
}>;

type AccessibleBooking = BookingWithRelations;

const bookingRelationsInclude = {
  eventType: {
    include: {
      schedule: {
        include: {
          availabilityRules: true,
          dateOverrides: true,
        },
      },
    },
  },
  host: {
    select: {
      id: true,
        username: true,
        name: true,
        email: true,
        title: true,
        welcome: true,
        timezone: true,
    },
  },
  auditLogs: {
    orderBy: { createdAt: "asc" as const },
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  },
  rescheduledFrom: {
    select: {
      id: true,
      publicToken: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  },
  rescheduledTo: {
    select: {
      id: true,
      publicToken: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  },
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingsService {
  private static readonly PAGE_SIZE = 20;
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listForHost(userId: string, query: BookingListQueryDto): Promise<unknown> {
    const page = query.page ?? 1;
    const where = this.buildHostBookingWhere(userId, query);

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: {
          eventType: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { startTime: "desc" },
        skip: (page - 1) * BookingsService.PAGE_SIZE,
        take: BookingsService.PAGE_SIZE,
      }),
    ]);

    return {
      items: bookings.map((booking) => ({
        id: booking.id,
        publicToken: booking.publicToken,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        inviteeTimezone: booking.inviteeTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        notes: booking.notes,
        eventType: booking.eventType,
      })),
      page,
      pageSize: BookingsService.PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / BookingsService.PAGE_SIZE)),
    };
  }

  async getById(userId: string, bookingId: string): Promise<unknown> {
    const booking = await this.findOwnedBookingOrThrow(userId, bookingId);
    return this.toBookingDetailResponse(booking);
  }

  async updateNotes(userId: string, bookingId: string, body: UpdateBookingNotesDto): Promise<unknown> {
    await this.findOwnedBookingOrThrow(userId, bookingId);

    const booking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        notes: body.notes?.trim() || null,
      },
      include: bookingRelationsInclude,
    });

    return this.toBookingDetailResponse(booking);
  }

  async cancelByHost(userId: string, bookingId: string, body: CancelBookingDto): Promise<unknown> {
    const booking = await this.findOwnedBookingOrThrow(userId, bookingId);
    return this.cancelBooking(booking, BookingAuditActorType.HOST, userId, body);
  }

  async rescheduleByHost(userId: string, bookingId: string, body: RescheduleBookingDto): Promise<unknown> {
    const booking = await this.findOwnedBookingOrThrow(userId, bookingId);
    return this.rescheduleBooking(booking, body, BookingAuditActorType.HOST, userId);
  }

  async getByPublicToken(token: string): Promise<unknown> {
    const booking = await this.findPublicBookingOrThrow(token);
    return this.toPublicBookingResponse(booking);
  }

  async cancelByPublicToken(token: string, body: CancelBookingDto): Promise<unknown> {
    const booking = await this.findPublicBookingOrThrow(token);
    return this.cancelBooking(booking, BookingAuditActorType.INVITEE, null, body);
  }

  async rescheduleByPublicToken(token: string, body: RescheduleBookingDto): Promise<unknown> {
    const booking = await this.findPublicBookingOrThrow(token);
    return this.rescheduleBooking(booking, body, BookingAuditActorType.INVITEE, null);
  }

  async exportCsv(userId: string, query: BookingListQueryDto): Promise<string> {
    const rows = await this.prisma.booking.findMany({
      where: this.buildHostBookingWhere(userId, query),
      include: {
        eventType: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    const header = [
      "id",
      "publicToken",
      "eventTypeTitle",
      "eventTypeSlug",
      "inviteeName",
      "inviteeEmail",
      "inviteeTimezone",
      "startTime",
      "endTime",
      "status",
      "notes",
    ];

    const data = rows.map((booking) => [
      booking.id,
      booking.publicToken,
      booking.eventType.title,
      booking.eventType.slug,
      booking.inviteeName,
      booking.inviteeEmail,
      booking.inviteeTimezone,
      booking.startTime.toISOString(),
      booking.endTime.toISOString(),
      booking.status,
      booking.notes ?? "",
    ]);

    return [header, ...data]
      .map((line) => line.map((value) => this.escapeCsv(String(value))).join(","))
      .join("\n");
  }

  private async cancelBooking(
    booking: AccessibleBooking,
    actorType: BookingAuditActorType,
    actorUserId: string | null,
    body: CancelBookingDto,
  ) {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ConflictException("Only confirmed bookings can be cancelled.");
    }

    const updated = await this.prisma.withTransaction(async (tx) => {
      const fresh = await tx.booking.findUnique({
        where: { id: booking.id },
        include: bookingRelationsInclude,
      });

      if (!fresh) {
        throw new NotFoundException("Booking not found.");
      }

      if (fresh.status !== BookingStatus.CONFIRMED) {
        throw new ConflictException("Only confirmed bookings can be cancelled.");
      }

      await tx.booking.update({
        where: { id: fresh.id },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      await tx.bookingAuditLog.create({
        data: {
          bookingId: fresh.id,
          actorType,
          actorUserId,
          action: BookingAuditAction.CANCELLED,
          metadata: {
            reason: body.reason ?? null,
            message: body.message ?? null,
          },
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: fresh.id },
        include: bookingRelationsInclude,
      });
    });

    await this.safeEnqueue(async () => {
      await this.notificationsService.enqueueBookingCancelled(
        this.toNotificationContext(updated),
        {
          reason: body.reason ?? null,
          message: body.message ?? null,
        },
      );
    }, "cancel");

    return {
      ok: true,
      booking: this.toBookingSummary(updated),
    };
  }

  private async rescheduleBooking(
    booking: AccessibleBooking,
    body: RescheduleBookingDto,
    actorType: BookingAuditActorType,
    actorUserId: string | null,
  ) {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ConflictException("Only confirmed bookings can be rescheduled.");
    }

    const requestedStartUtc = this.assertDateTime(body.startTime, "startTime").toUTC();
    const requestedEndUtc = requestedStartUtc.plus({ minutes: booking.eventType.durationMinutes });
    const forDate = requestedStartUtc.setZone(booking.eventType.schedule.timezone).toISODate();

    if (!forDate) {
      throw new BadRequestException("Unable to resolve reschedule date.");
    }

    let result: {
      previousBookingId: string;
      replacementBookingId: string;
    };

    try {
      result = await this.prisma.withTransaction(async (tx) => {
        const fresh = await tx.booking.findUnique({
          where: { id: booking.id },
          include: bookingRelationsInclude,
        });

        if (!fresh) {
          throw new NotFoundException("Booking not found.");
        }

        if (fresh.status !== BookingStatus.CONFIRMED) {
          throw new ConflictException("Only confirmed bookings can be rescheduled.");
        }

        await this.lockSlot(
          tx,
          fresh.hostId,
          this.toIsoString(requestedStartUtc),
          this.toIsoString(requestedEndUtc),
        );

        const currentBookings = await this.loadHostBookings(
          tx,
          fresh.hostId,
          fresh.eventType.schedule.timezone,
          forDate,
          fresh.id,
        );

        const slots = computeAvailableSlots({
          schedule: this.toSlotEngineSchedule(fresh.eventType.schedule),
          eventType: this.toSlotEngineEventType(fresh.eventType),
          existingBookings: currentBookings,
          externalBusyBlocks: [],
          forDate,
          invoTimezone: fresh.inviteeTimezone,
          now: DateTime.utc(),
        });

        const isStillAvailable = slots.some((slot) =>
          slot.startUtc === this.toIsoString(requestedStartUtc) &&
          slot.endUtc === this.toIsoString(requestedEndUtc));

        if (!isStillAvailable) {
          throw new ConflictException("This slot is no longer available. Please choose another time.");
        }

        const exactConflict = await tx.booking.findFirst({
          where: {
            hostId: fresh.hostId,
            status: BookingStatus.CONFIRMED,
            startTime: requestedStartUtc.toJSDate(),
            endTime: requestedEndUtc.toJSDate(),
            NOT: { id: fresh.id },
          },
          select: { id: true },
        });

        if (exactConflict) {
          throw new ConflictException("This slot is no longer available. Please choose another time.");
        }

        const newBooking = await tx.booking.create({
          data: {
            eventTypeId: fresh.eventTypeId,
            hostId: fresh.hostId,
            inviteeName: fresh.inviteeName,
            inviteeEmail: fresh.inviteeEmail,
            inviteeTimezone: fresh.inviteeTimezone,
            startTime: requestedStartUtc.toJSDate(),
            endTime: requestedEndUtc.toJSDate(),
            status: BookingStatus.CONFIRMED,
            publicToken: randomBytes(32).toString("hex"),
            answers: fresh.answers as Prisma.InputJsonValue,
            notes: fresh.notes,
            rescheduledFromId: fresh.id,
          },
        });

        await tx.booking.update({
          where: { id: fresh.id },
          data: {
            status: BookingStatus.RESCHEDULED,
          },
        });

        await tx.bookingAuditLog.createMany({
          data: [
            {
              bookingId: fresh.id,
              actorType,
              actorUserId,
              action: BookingAuditAction.RESCHEDULED,
              metadata: {
                kind: "source",
                newBookingId: newBooking.id,
                newPublicToken: newBooking.publicToken,
                reason: body.reason ?? null,
                message: body.message ?? null,
              },
            },
            {
              bookingId: newBooking.id,
              actorType,
              actorUserId,
              action: BookingAuditAction.RESCHEDULED,
              metadata: {
                kind: "replacement",
                previousBookingId: fresh.id,
                previousPublicToken: fresh.publicToken,
                reason: body.reason ?? null,
                message: body.message ?? null,
              },
            },
          ],
        });

        return {
          previousBookingId: fresh.id,
          replacementBookingId: newBooking.id,
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        const slotUnavailable = await this.isRescheduleSlotUnavailableAfterTransactionFailure(
          booking.id,
          requestedStartUtc,
          requestedEndUtc,
          forDate,
        );

        if (slotUnavailable) {
          throw new ConflictException("This slot is no longer available. Please choose another time.");
        }
      }

      throw error;
    }

    const [previousBooking, newBooking] = await Promise.all([
      this.findBookingByIdOrThrow(result.previousBookingId),
      this.findBookingByIdOrThrow(result.replacementBookingId),
    ]);

    await this.safeEnqueue(async () => {
      await this.notificationsService.enqueueBookingRescheduled(
        this.toNotificationContext(previousBooking),
        this.toNotificationContext(newBooking),
        {
          reason: body.reason ?? null,
          message: body.message ?? null,
          previousStartTime: previousBooking.startTime,
          previousEndTime: previousBooking.endTime,
        },
      );
    }, "reschedule");

    return {
      ok: true,
      previousBooking: this.toBookingSummary(previousBooking),
      newBooking: this.toBookingSummary(newBooking),
    };
  }

  private buildHostBookingWhere(userId: string, query: BookingListQueryDto): Prisma.BookingWhereInput {
    const now = new Date();
    const startTimeFilter: Prisma.DateTimeFilter = {};
    const where: Prisma.BookingWhereInput = {
      hostId: userId,
    };

    if (query.status) {
      const normalized = query.status.toLowerCase();

      if (normalized === "upcoming") {
        where.status = BookingStatus.CONFIRMED;
        startTimeFilter.gte = now;
      } else if (normalized === "past") {
        where.status = BookingStatus.CONFIRMED;
        startTimeFilter.lt = now;
      } else if (normalized === "cancelled") {
        where.status = BookingStatus.CANCELLED;
      } else if (normalized === "rescheduled") {
        where.status = BookingStatus.RESCHEDULED;
      } else if (normalized === "confirmed") {
        where.status = BookingStatus.CONFIRMED;
      } else {
        throw new BadRequestException("Unsupported status filter.");
      }
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { inviteeName: { contains: search, mode: "insensitive" } },
        { inviteeEmail: { contains: search, mode: "insensitive" } },
        { eventType: { title: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (query.from) {
      startTimeFilter.gte = new Date(`${query.from}T00:00:00.000Z`);
    }

    if (query.to) {
      startTimeFilter.lte = new Date(`${query.to}T23:59:59.999Z`);
    }

    if (query.eventTypeId) {
      where.eventTypeId = query.eventTypeId;
    }

    if (Object.keys(startTimeFilter).length > 0) {
      where.startTime = startTimeFilter;
    }

    return where;
  }

  private async findOwnedBookingOrThrow(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        hostId: userId,
      },
      include: bookingRelationsInclude,
    });

    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }

    return booking;
  }

  private async findPublicBookingOrThrow(token: string) {
    const booking = await this.prisma.booking.findUnique({
      where: {
        publicToken: token,
      },
      include: bookingRelationsInclude,
    });

    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }

    return booking;
  }

  private async findBookingByIdOrThrow(bookingId: string) {
    return this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: bookingRelationsInclude,
    });
  }

  private async isRescheduleSlotUnavailableAfterTransactionFailure(
    bookingId: string,
    requestedStartUtc: DateTime,
    requestedEndUtc: DateTime,
    forDate: string,
  ) {
    try {
      const fresh = await this.findBookingByIdOrThrow(bookingId);

      if (fresh.status !== BookingStatus.CONFIRMED) {
        return true;
      }

      const currentBookings = await this.loadHostBookings(
        this.prisma,
        fresh.hostId,
        fresh.eventType.schedule.timezone,
        forDate,
        fresh.id,
      );

      const exactConflict = currentBookings.some((currentBooking) =>
        DateTime.fromJSDate(currentBooking.startTime).toUTC().toMillis() === requestedStartUtc.toMillis() &&
        DateTime.fromJSDate(currentBooking.endTime).toUTC().toMillis() === requestedEndUtc.toMillis(),
      );

      if (exactConflict) {
        return true;
      }

      const slots = computeAvailableSlots({
        schedule: this.toSlotEngineSchedule(fresh.eventType.schedule),
        eventType: this.toSlotEngineEventType(fresh.eventType),
        existingBookings: currentBookings,
        externalBusyBlocks: [],
        forDate,
        invoTimezone: fresh.inviteeTimezone,
        now: DateTime.utc(),
      });

      return !slots.some((slot) =>
        slot.startUtc === this.toIsoString(requestedStartUtc) &&
        slot.endUtc === this.toIsoString(requestedEndUtc));
    } catch {
      return false;
    }
  }

  private async loadHostBookings(
    db: PrismaService | Prisma.TransactionClient,
    hostId: string,
    scheduleTimezone: string,
    forDate: string,
    excludeBookingId?: string,
  ) {
    const queryDate = DateTime.fromISO(forDate, { zone: scheduleTimezone }).startOf("day");
    const weekStartUtc = queryDate.startOf("week").toUTC().toJSDate();
    const weekEndUtc = queryDate.startOf("week").plus({ days: 6 }).endOf("day").toUTC().toJSDate();

    return db.booking.findMany({
      where: {
        hostId,
        status: BookingStatus.CONFIRMED,
        startTime: {
          gte: weekStartUtc,
          lte: weekEndUtc,
        },
        ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
      },
      select: {
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: { startTime: "asc" },
    });
  }

  private async lockSlot(
    tx: Prisma.TransactionClient,
    hostId: string,
    startIso: string,
    endIso: string,
  ) {
    const slotKey = `${startIso}|${endIso}`;
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${hostId}), hashtext(${slotKey}))
    `;
  }

  private toSlotEngineSchedule(schedule: BookingWithRelations["eventType"]["schedule"]) {
    return {
      timezone: schedule.timezone,
      availabilityRules: schedule.availabilityRules.map((rule) => ({
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
      })),
      dateOverrides: schedule.dateOverrides.map((override) => ({
        date: override.date.toISOString().slice(0, 10),
        isClosed: override.isClosed,
        startTime: override.startTime,
        endTime: override.endTime,
      })),
    };
  }

  private toSlotEngineEventType(eventType: BookingWithRelations["eventType"]) {
    return {
      durationMinutes: eventType.durationMinutes,
      bufferBeforeMins: eventType.bufferBeforeMins,
      bufferAfterMins: eventType.bufferAfterMins,
      minNoticeMins: eventType.minNoticeMins,
      maxFutureDays: eventType.maxFutureDays,
      dailyLimit: eventType.dailyLimit,
      weeklyLimit: eventType.weeklyLimit,
    };
  }

  private assertDateTime(value: string, field: string) {
    const dateTime = DateTime.fromISO(value, { setZone: true });
    if (!dateTime.isValid) {
      throw new BadRequestException(`${field} must be a valid ISO-8601 datetime with timezone information.`);
    }

    return dateTime;
  }

  private toIsoString(value: DateTime) {
    const iso = value.toISO({ suppressMilliseconds: true });
    if (!iso) {
      throw new BadRequestException("Unable to serialize datetime value.");
    }

    return iso;
  }

  private toBookingSummary(booking: BookingWithRelations) {
    return {
      id: booking.id,
      publicToken: booking.publicToken,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteeTimezone: booking.inviteeTimezone,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      notes: booking.notes,
      eventType: {
        id: booking.eventType.id,
        title: booking.eventType.title,
        slug: booking.eventType.slug,
        durationMinutes: booking.eventType.durationMinutes,
      },
      host: {
        id: booking.host.id,
        username: booking.host.username,
        name: booking.host.name,
      },
      lineage: {
        rescheduledFrom: booking.rescheduledFrom,
        rescheduledTo: booking.rescheduledTo,
      },
    };
  }

  private toBookingDetailResponse(booking: BookingWithRelations) {
    return {
      booking: {
        ...this.toBookingSummary(booking),
        answers: booking.answers,
        auditLogs: booking.auditLogs.map((log) => ({
          id: log.id,
          actorType: log.actorType,
          actorUser: log.actorUser,
          action: log.action,
          metadata: log.metadata,
          createdAt: log.createdAt,
        })),
      },
    };
  }

  private toPublicBookingResponse(booking: BookingWithRelations) {
    return {
      booking: {
        id: booking.id,
        publicToken: booking.publicToken,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        inviteeTimezone: booking.inviteeTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        notes: booking.notes,
        answers: booking.answers,
        lineage: {
          rescheduledFrom: booking.rescheduledFrom,
          rescheduledTo: booking.rescheduledTo,
        },
      },
      host: {
        username: booking.host.username,
        name: booking.host.name,
        title: booking.host.title,
        welcome: booking.host.welcome,
        timezone: booking.host.timezone,
      },
      eventType: {
        id: booking.eventType.id,
        slug: booking.eventType.slug,
        title: booking.eventType.title,
        duration: booking.eventType.durationMinutes,
        durationMinutes: booking.eventType.durationMinutes,
      },
    };
  }

  private escapeCsv(value: string) {
    const escaped = value.replaceAll("\"", "\"\"");
    return `"${escaped}"`;
  }

  private toNotificationContext(booking: BookingWithRelations) {
    return {
      bookingId: booking.id,
      bookingPublicToken: booking.publicToken,
      startTime: booking.startTime,
      endTime: booking.endTime,
      host: {
        email: booking.host.email,
        name: booking.host.name,
        username: booking.host.username,
      },
      invitee: {
        email: booking.inviteeEmail,
        name: booking.inviteeName,
        timezone: booking.inviteeTimezone,
      },
      eventType: {
        title: booking.eventType.title,
        slug: booking.eventType.slug,
        durationMinutes: booking.eventType.durationMinutes,
      },
    };
  }

  private async safeEnqueue(operation: () => Promise<void>, action: string) {
    try {
      await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown notification enqueue failure.";
      this.logger.error(`Failed to enqueue ${action} notifications: ${message}`);
    }
  }
}
