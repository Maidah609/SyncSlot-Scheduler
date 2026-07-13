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
  BookingQuestionType,
  BookingStatus,
  LocationType,
  Prisma,
  PrismaService,
} from "@syncslot/database";
import { computeAvailableSlots } from "@syncslot/slot-engine";
import { DateTime } from "luxon";
import { NotificationsService } from "../notifications/notifications.service";
import { CreatePublicBookingDto } from "./dto/create-public-booking.dto";
import { PublicSlotsQueryDto } from "./dto/public-slots-query.dto";

type PublicEventRecord = Prisma.EventTypeGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        username: true;
        name: true;
        email: true;
        title: true;
        welcome: true;
        timezone: true;
        emailVerifiedAt: true;
        onboardingCompletedAt: true;
      };
    };
    schedule: {
      include: {
        availabilityRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }];
        };
        dateOverrides: {
          orderBy: { date: "asc" };
        };
      };
    };
    bookingQuestions: {
      orderBy: { order: "asc" };
    };
  };
}>;

type PublicProfileRecord = Prisma.UserGetPayload<{
  select: {
    username: true;
    name: true;
    title: true;
    welcome: true;
    timezone: true;
    emailVerifiedAt: true;
    onboardingCompletedAt: true;
    eventTypes: {
      include: {
        schedule: {
          select: {
            name: true;
          };
        };
        bookingQuestions: {
          orderBy: { order: "asc" };
        };
      };
      orderBy: { createdAt: "asc" };
    };
  };
}>;

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getPublicProfile(username: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        name: true,
        email: true,
        title: true,
        welcome: true,
        timezone: true,
        emailVerifiedAt: true,
        onboardingCompletedAt: true,
        eventTypes: {
          include: {
            schedule: {
              select: {
                name: true,
              },
            },
            bookingQuestions: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user || !user.emailVerifiedAt || !user.onboardingCompletedAt) {
      throw new NotFoundException("Public profile not found.");
    }

    return this.toPublicProfileResponse(user);
  }

  async getPublicEvent(username: string, eventSlug: string): Promise<unknown> {
    const event = await this.findPublicEventOrThrow(this.prisma, username, eventSlug);
    return this.toPublicEventResponse(event);
  }

  async getPublicSlots(username: string, eventSlug: string, query: PublicSlotsQueryDto): Promise<unknown> {
    const event = await this.findPublicEventOrThrow(this.prisma, username, eventSlug);
    const inviteeTimezone = this.assertTimezone(query.tz, "tz");
    const forDate = this.assertScheduleDate(query.date, event.schedule.timezone);

    const existingBookings = await this.loadHostBookings(
      this.prisma,
      event.user.id,
      event.schedule.timezone,
      forDate,
    );

    const slots = computeAvailableSlots({
      schedule: this.toSlotEngineSchedule(event.schedule),
      eventType: this.toSlotEngineEventType(event),
      existingBookings,
      externalBusyBlocks: [],
      forDate,
      invoTimezone: inviteeTimezone,
      now: DateTime.utc(),
    });

    return {
      date: forDate,
      timezone: inviteeTimezone,
      slots,
    };
  }

  async createPublicBooking(username: string, eventSlug: string, body: CreatePublicBookingDto): Promise<unknown> {
    const inviteeTimezone = this.assertTimezone(body.inviteeTimezone, "inviteeTimezone");
    const requestedStartUtc = this.assertDateTime(body.startTime, "startTime").toUTC();

    const event = await this.findPublicEventOrThrow(this.prisma, username, eventSlug);
    const forDate = requestedStartUtc.setZone(event.schedule.timezone).toISODate();
    if (!forDate) {
      throw new BadRequestException("Unable to resolve slot date.");
    }

    const normalizedAnswers = this.validateAnswers(event.bookingQuestions, body.answers ?? {});
    const requestedEndUtc = requestedStartUtc.plus({ minutes: event.durationMinutes });

    let booking: {
      booking: {
        id: string;
        publicToken: string;
        inviteeName: string;
        inviteeEmail: string;
        inviteeTimezone: string;
        startTime: Date;
        endTime: Date;
        status: BookingStatus;
        answers: Prisma.JsonValue;
        notes: string | null;
      };
      event: PublicEventRecord;
    };

    try {
      booking = await this.prisma.withTransaction(async (tx) => {
        const authoritativeEvent = await this.findPublicEventOrThrow(tx, username, eventSlug);

        await this.lockSlot(
          tx,
          authoritativeEvent.user.id,
          requestedStartUtc.toISO({ suppressMilliseconds: true }) ?? requestedStartUtc.toISO(),
          requestedEndUtc.toISO({ suppressMilliseconds: true }) ?? requestedEndUtc.toISO(),
        );

        const currentBookings = await this.loadHostBookings(
          tx,
          authoritativeEvent.user.id,
          authoritativeEvent.schedule.timezone,
          forDate,
        );

        const slots = computeAvailableSlots({
          schedule: this.toSlotEngineSchedule(authoritativeEvent.schedule),
          eventType: this.toSlotEngineEventType(authoritativeEvent),
          existingBookings: currentBookings,
          externalBusyBlocks: [],
          forDate,
          invoTimezone: inviteeTimezone,
          now: DateTime.utc(),
        });

        const requestedStartIso = this.toIsoString(requestedStartUtc);
        const requestedEndIso = this.toIsoString(requestedEndUtc);
        const isStillAvailable = slots.some((slot) =>
          slot.startUtc === requestedStartIso && slot.endUtc === requestedEndIso);

        if (!isStillAvailable) {
          throw new ConflictException("This slot is no longer available. Please choose another time.");
        }

        const exactConflict = await tx.booking.findFirst({
          where: {
            hostId: authoritativeEvent.user.id,
            startTime: requestedStartUtc.toJSDate(),
            endTime: requestedEndUtc.toJSDate(),
            status: BookingStatus.CONFIRMED,
          },
          select: { id: true },
        });

        if (exactConflict) {
          throw new ConflictException("This slot is no longer available. Please choose another time.");
        }

        const createdBooking = await tx.booking.create({
          data: {
            eventTypeId: authoritativeEvent.id,
            hostId: authoritativeEvent.user.id,
            inviteeName: body.inviteeName.trim(),
            inviteeEmail: body.inviteeEmail.trim().toLowerCase(),
            inviteeTimezone,
            startTime: requestedStartUtc.toJSDate(),
            endTime: requestedEndUtc.toJSDate(),
            status: BookingStatus.CONFIRMED,
            publicToken: randomBytes(32).toString("hex"),
            answers: normalizedAnswers,
            notes: body.notes?.trim() || null,
          },
        });

        await tx.bookingAuditLog.create({
          data: {
            bookingId: createdBooking.id,
            actorType: BookingAuditActorType.INVITEE,
            actorUserId: null,
            action: BookingAuditAction.CREATED,
            metadata: {
              source: "public-booking",
              username,
              eventSlug,
            },
          },
        });

        return {
          booking: createdBooking,
          event: authoritativeEvent,
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        const slotUnavailable = await this.isSlotUnavailableAfterTransactionFailure(
          username,
          eventSlug,
          requestedStartUtc,
          requestedEndUtc,
          forDate,
          inviteeTimezone,
        );

        if (slotUnavailable) {
          throw new ConflictException("This slot is no longer available. Please choose another time.");
        }
      }

      throw error;
    }

    await this.safeEnqueue(async () => {
      await this.notificationsService.enqueueBookingCreated(this.toNotificationContext(booking.booking, booking.event));
    }, "booking creation");

    return {
      booking: {
        id: booking.booking.id,
        publicToken: booking.booking.publicToken,
        inviteeName: booking.booking.inviteeName,
        inviteeEmail: booking.booking.inviteeEmail,
        inviteeTimezone: booking.booking.inviteeTimezone,
        startTime: booking.booking.startTime,
        endTime: booking.booking.endTime,
        status: booking.booking.status,
        answers: booking.booking.answers,
        notes: booking.booking.notes,
      },
      host: {
        username: booking.event.user.username,
        name: booking.event.user.name,
      },
      eventType: {
        id: booking.event.id,
        slug: booking.event.slug,
        title: booking.event.title,
        duration: booking.event.durationMinutes,
        durationMinutes: booking.event.durationMinutes,
        location: this.toPublicLocation(booking.event.locationType, booking.event.locationValue),
        locationType: booking.event.locationType,
        locationValue: booking.event.locationValue,
      },
    };
  }

  private async findPublicEventOrThrow(
    db: PrismaService | Prisma.TransactionClient,
    username: string,
    eventSlug: string,
  ) {
    const event = await db.eventType.findFirst({
      where: {
        slug: eventSlug,
        isActive: true,
        user: {
          is: {
            username,
            emailVerifiedAt: { not: null },
            onboardingCompletedAt: { not: null },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            title: true,
            welcome: true,
            timezone: true,
            emailVerifiedAt: true,
            onboardingCompletedAt: true,
          },
        },
        schedule: {
          include: {
            availabilityRules: {
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
            dateOverrides: {
              orderBy: { date: "asc" },
            },
          },
        },
        bookingQuestions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event type not found.");
    }

    return event;
  }

  private async loadHostBookings(
    db: PrismaService | Prisma.TransactionClient,
    hostId: string,
    scheduleTimezone: string,
    forDate: string,
  ) {
    const queryDate = DateTime.fromISO(forDate, { zone: scheduleTimezone }).startOf("day");
    if (!queryDate.isValid) {
      throw new BadRequestException("Invalid schedule date.");
    }

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

  private async isSlotUnavailableAfterTransactionFailure(
    username: string,
    eventSlug: string,
    requestedStartUtc: DateTime,
    requestedEndUtc: DateTime,
    forDate: string,
    inviteeTimezone: string,
  ) {
    try {
      const event = await this.findPublicEventOrThrow(this.prisma, username, eventSlug);
      const currentBookings = await this.loadHostBookings(
        this.prisma,
        event.user.id,
        event.schedule.timezone,
        forDate,
      );

      const exactConflict = currentBookings.some((booking) =>
        DateTime.fromJSDate(booking.startTime).toUTC().toMillis() === requestedStartUtc.toMillis() &&
        DateTime.fromJSDate(booking.endTime).toUTC().toMillis() === requestedEndUtc.toMillis(),
      );

      if (exactConflict) {
        return true;
      }

      const slots = computeAvailableSlots({
        schedule: this.toSlotEngineSchedule(event.schedule),
        eventType: this.toSlotEngineEventType(event),
        existingBookings: currentBookings,
        externalBusyBlocks: [],
        forDate,
        invoTimezone: inviteeTimezone,
        now: DateTime.utc(),
      });

      const requestedStartIso = this.toIsoString(requestedStartUtc);
      const requestedEndIso = this.toIsoString(requestedEndUtc);

      return !slots.some((slot) => slot.startUtc === requestedStartIso && slot.endUtc === requestedEndIso);
    } catch {
      return false;
    }
  }

  private validateAnswers(
    questions: PublicEventRecord["bookingQuestions"],
    rawAnswers: Record<string, unknown>,
  ) {
    if (Array.isArray(rawAnswers) || rawAnswers === null) {
      throw new BadRequestException("answers must be an object keyed by booking question id.");
    }

    const allowedQuestionIds = new Set(questions.map((question) => question.id));
    for (const answerKey of Object.keys(rawAnswers)) {
      if (!allowedQuestionIds.has(answerKey)) {
        throw new BadRequestException(`Unknown booking question: ${answerKey}`);
      }
    }

    const answers: Record<string, string | string[]> = {};

    for (const question of questions) {
      const answer = rawAnswers[question.id];
      const options = Array.isArray(question.options) ? question.options.filter((value): value is string => typeof value === "string") : [];

      if (answer === undefined || answer === null || answer === "") {
        if (question.isRequired) {
          throw new BadRequestException(`Answer required for question: ${question.label}`);
        }
        continue;
      }

      if (question.type === BookingQuestionType.SHORT_TEXT || question.type === BookingQuestionType.LONG_TEXT) {
        if (typeof answer !== "string") {
          throw new BadRequestException(`Answer for question ${question.label} must be a string.`);
        }

        const normalized = answer.trim();
        if (!normalized && question.isRequired) {
          throw new BadRequestException(`Answer required for question: ${question.label}`);
        }

        if (normalized) {
          answers[question.id] = normalized;
        }
        continue;
      }

      if (question.type === BookingQuestionType.SINGLE_SELECT) {
        if (typeof answer !== "string" || !options.includes(answer)) {
          throw new BadRequestException(`Answer for question ${question.label} must be one of the configured options.`);
        }

        answers[question.id] = answer;
        continue;
      }

      if (!Array.isArray(answer) || answer.some((value) => typeof value !== "string" || !options.includes(value))) {
        throw new BadRequestException(`Answer for question ${question.label} must be an array of configured options.`);
      }

      answers[question.id] = answer;
    }

    return answers;
  }

  private toPublicProfileResponse(user: PublicProfileRecord) {
    return {
      username: user.username,
      name: user.name,
      title: user.title,
      welcome: user.welcome,
      timezone: user.timezone,
      initials: this.getInitials(user.name),
      eventTypes: user.eventTypes.map((eventType) => this.toPublicEventCard(eventType)),
    };
  }

  private toPublicEventResponse(event: PublicEventRecord) {
    return {
      host: {
        username: event.user.username,
        name: event.user.name,
        title: event.user.title,
        welcome: event.user.welcome,
        timezone: event.user.timezone,
        initials: this.getInitials(event.user.name),
      },
      eventType: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        duration: event.durationMinutes,
        durationMinutes: event.durationMinutes,
        description: event.description ?? "",
        location: this.toPublicLocation(event.locationType, event.locationValue),
        locationType: event.locationType,
        locationValue: event.locationValue,
        color: event.color,
        active: event.isActive,
        isActive: event.isActive,
        scheduleName: event.schedule.name,
        scheduleId: event.scheduleId,
        cancellationPolicy: event.cancellationPolicy ?? "",
        bufferBefore: event.bufferBeforeMins,
        bufferBeforeMins: event.bufferBeforeMins,
        bufferAfter: event.bufferAfterMins,
        bufferAfterMins: event.bufferAfterMins,
        minNoticeHours: event.minNoticeMins / 60,
        minNoticeMins: event.minNoticeMins,
        maxFutureDays: event.maxFutureDays,
        dailyLimit: event.dailyLimit,
        weeklyLimit: event.weeklyLimit,
        questions: event.bookingQuestions.map((question) => this.toPublicQuestion(question)),
      },
    };
  }

  private toPublicEventCard(eventType: PublicProfileRecord["eventTypes"][number]) {
    return {
      id: eventType.id,
      slug: eventType.slug,
      title: eventType.title,
      duration: eventType.durationMinutes,
      durationMinutes: eventType.durationMinutes,
      description: eventType.description ?? "",
      location: this.toPublicLocation(eventType.locationType, eventType.locationValue),
      locationType: eventType.locationType,
      locationValue: eventType.locationValue,
      color: eventType.color,
      active: eventType.isActive,
      isActive: eventType.isActive,
      scheduleName: eventType.schedule.name,
      cancellationPolicy: eventType.cancellationPolicy ?? "",
      bufferBefore: eventType.bufferBeforeMins,
      bufferBeforeMins: eventType.bufferBeforeMins,
      bufferAfter: eventType.bufferAfterMins,
      bufferAfterMins: eventType.bufferAfterMins,
      minNoticeHours: eventType.minNoticeMins / 60,
      minNoticeMins: eventType.minNoticeMins,
      maxFutureDays: eventType.maxFutureDays,
      dailyLimit: eventType.dailyLimit,
      weeklyLimit: eventType.weeklyLimit,
      questions: eventType.bookingQuestions.map((question) => this.toPublicQuestion(question)),
    };
  }

  private toPublicQuestion(question: PublicEventRecord["bookingQuestions"][number]) {
    const options = Array.isArray(question.options)
      ? question.options.filter((value): value is string => typeof value === "string")
      : [];

    return {
      id: question.id,
      label: question.label,
      type: this.toPublicQuestionType(question.type, options),
      backendType: question.type,
      required: question.isRequired,
      options,
    };
  }

  private toPublicQuestionType(type: BookingQuestionType, options: string[]) {
    if (type === BookingQuestionType.SHORT_TEXT || type === BookingQuestionType.LONG_TEXT) {
      return "text";
    }

    if (
      type === BookingQuestionType.SINGLE_SELECT &&
      options.length === 2 &&
      options[0].toLowerCase() === "yes" &&
      options[1].toLowerCase() === "no"
    ) {
      return "yes-no";
    }

    return "multiple-choice";
  }

  private toPublicLocation(locationType: LocationType, locationValue: string | null) {
    switch (locationType) {
      case LocationType.IN_PERSON:
        return "in-person";
      case LocationType.PHONE:
        return "phone";
      case LocationType.CUSTOM:
        return "custom";
      case LocationType.VIDEO:
      default:
        return locationValue?.toLowerCase().includes("google") ? "google-meet" : "zoom";
    }
  }

  private getInitials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  private assertTimezone(value: string, field: string) {
    const zoned = DateTime.now().setZone(value);
    if (!zoned.isValid) {
      throw new BadRequestException(`${field} must be a valid IANA timezone.`);
    }

    return value;
  }

  private assertScheduleDate(value: string, scheduleTimezone: string) {
    const date = DateTime.fromISO(value, { zone: scheduleTimezone }).startOf("day");
    if (!date.isValid || date.toISODate() !== value) {
      throw new BadRequestException("date must be a valid YYYY-MM-DD value.");
    }

    return value;
  }

  private assertDateTime(value: string, field: string) {
    const dateTime = DateTime.fromISO(value, { setZone: true });
    if (!dateTime.isValid) {
      throw new BadRequestException(`${field} must be a valid ISO-8601 datetime with timezone information.`);
    }

    return dateTime;
  }

  private toSlotEngineSchedule(schedule: PublicEventRecord["schedule"]) {
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

  private toSlotEngineEventType(event: PublicEventRecord) {
    return {
      durationMinutes: event.durationMinutes,
      bufferBeforeMins: event.bufferBeforeMins,
      bufferAfterMins: event.bufferAfterMins,
      minNoticeMins: event.minNoticeMins,
      maxFutureDays: event.maxFutureDays,
      dailyLimit: event.dailyLimit,
      weeklyLimit: event.weeklyLimit,
    };
  }

  private toIsoString(value: DateTime) {
    const iso = value.toISO({ suppressMilliseconds: true });
    if (!iso) {
      throw new BadRequestException("Unable to serialize datetime value.");
    }

    return iso;
  }

  private toNotificationContext(
    booking: {
      id: string;
      publicToken: string;
      inviteeName: string;
      inviteeEmail: string;
      inviteeTimezone: string;
      startTime: Date;
      endTime: Date;
    },
    event: PublicEventRecord,
  ) {
    return {
      bookingId: booking.id,
      bookingPublicToken: booking.publicToken,
      startTime: booking.startTime,
      endTime: booking.endTime,
      host: {
        email: event.user.email,
        name: event.user.name,
        username: event.user.username,
      },
      invitee: {
        email: booking.inviteeEmail,
        name: booking.inviteeName,
        timezone: booking.inviteeTimezone,
      },
      eventType: {
        title: event.title,
        slug: event.slug,
        durationMinutes: event.durationMinutes,
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
