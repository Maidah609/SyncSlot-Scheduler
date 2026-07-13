import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingQuestionType,
  Prisma,
  PrismaService,
} from "@syncslot/database";
import { CreateEventTypeDto } from "./dto/create-event-type.dto";
import { EventTypeQuestionDto } from "./dto/event-type-question.dto";
import { EventTypeStatusDto } from "./dto/event-type-status.dto";
import { UpdateEventTypeDto } from "./dto/update-event-type.dto";

@Injectable()
export class EventTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const eventTypes = await this.prisma.eventType.findMany({
      where: { userId },
      include: {
        bookingQuestions: {
          orderBy: { order: "asc" },
        },
        schedule: {
          select: { id: true, name: true, timezone: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return eventTypes.map((eventType) => this.toResponse(eventType));
  }

  async create(userId: string, input: CreateEventTypeDto) {
    await this.assertScheduleOwnership(userId, input.scheduleId);
    await this.assertSlugAvailable(userId, input.slug);
    this.validateQuestions(input.bookingQuestions);

    const eventType = await this.prisma.eventType.create({
      data: {
        userId,
        title: input.title,
        slug: input.slug,
        durationMinutes: input.durationMinutes,
        description: input.description ?? null,
        color: input.color ?? null,
        locationType: input.locationType,
        locationValue: input.locationValue ?? null,
        cancellationPolicy: input.cancellationPolicy ?? null,
        isActive: input.isActive ?? true,
        minNoticeMins: input.minNoticeMins,
        maxFutureDays: input.maxFutureDays,
        bufferBeforeMins: input.bufferBeforeMins,
        bufferAfterMins: input.bufferAfterMins,
        dailyLimit: input.dailyLimit ?? null,
        weeklyLimit: input.weeklyLimit ?? null,
        scheduleId: input.scheduleId,
        bookingQuestions: {
          create: input.bookingQuestions.map((question) => this.toQuestionCreateInput(question)),
        },
      },
      include: {
        bookingQuestions: { orderBy: { order: "asc" } },
        schedule: { select: { id: true, name: true, timezone: true } },
      },
    });

    return this.toResponse(eventType);
  }

  async getById(userId: string, eventTypeId: string) {
    const eventType = await this.findOwnedEventType(userId, eventTypeId);
    return this.toResponse(eventType);
  }

  async update(userId: string, eventTypeId: string, input: UpdateEventTypeDto) {
    const existing = await this.findOwnedEventType(userId, eventTypeId);

    if (input.scheduleId) {
      await this.assertScheduleOwnership(userId, input.scheduleId);
    }

    if (input.slug && input.slug !== existing.slug) {
      await this.assertSlugAvailable(userId, input.slug, eventTypeId);
    }

    if (input.bookingQuestions) {
      this.validateQuestions(input.bookingQuestions);
    }

    const updated = await this.prisma.withTransaction(async (tx) => {
      await tx.eventType.update({
        where: { id: eventTypeId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {}),
          ...(input.color !== undefined ? { color: input.color ?? null } : {}),
          ...(input.locationType !== undefined ? { locationType: input.locationType } : {}),
          ...(input.locationValue !== undefined ? { locationValue: input.locationValue ?? null } : {}),
          ...(input.cancellationPolicy !== undefined ? { cancellationPolicy: input.cancellationPolicy ?? null } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.minNoticeMins !== undefined ? { minNoticeMins: input.minNoticeMins } : {}),
          ...(input.maxFutureDays !== undefined ? { maxFutureDays: input.maxFutureDays } : {}),
          ...(input.bufferBeforeMins !== undefined ? { bufferBeforeMins: input.bufferBeforeMins } : {}),
          ...(input.bufferAfterMins !== undefined ? { bufferAfterMins: input.bufferAfterMins } : {}),
          ...(input.dailyLimit !== undefined ? { dailyLimit: input.dailyLimit ?? null } : {}),
          ...(input.weeklyLimit !== undefined ? { weeklyLimit: input.weeklyLimit ?? null } : {}),
          ...(input.scheduleId !== undefined ? { scheduleId: input.scheduleId } : {}),
        },
      });

      if (input.bookingQuestions) {
        await this.syncQuestions(tx, eventTypeId, input.bookingQuestions);
      }

      return tx.eventType.findUniqueOrThrow({
        where: { id: eventTypeId },
        include: {
          bookingQuestions: { orderBy: { order: "asc" } },
          schedule: { select: { id: true, name: true, timezone: true } },
        },
      });
    });

    return this.toResponse(updated);
  }

  async remove(userId: string, eventTypeId: string) {
    await this.findOwnedEventType(userId, eventTypeId);

    await this.prisma.eventType.delete({
      where: { id: eventTypeId },
    });

    return { ok: true };
  }

  async duplicate(userId: string, eventTypeId: string) {
    const existing = await this.findOwnedEventType(userId, eventTypeId);
    const duplicateSlug = await this.generateDuplicateSlug(userId, existing.slug);

    const duplicated = await this.prisma.eventType.create({
      data: {
        userId,
        title: `${existing.title} Copy`,
        slug: duplicateSlug,
        durationMinutes: existing.durationMinutes,
        description: existing.description,
        color: existing.color,
        locationType: existing.locationType,
        locationValue: existing.locationValue,
        cancellationPolicy: existing.cancellationPolicy,
        isActive: false,
        minNoticeMins: existing.minNoticeMins,
        maxFutureDays: existing.maxFutureDays,
        bufferBeforeMins: existing.bufferBeforeMins,
        bufferAfterMins: existing.bufferAfterMins,
        dailyLimit: existing.dailyLimit,
        weeklyLimit: existing.weeklyLimit,
        scheduleId: existing.scheduleId,
        bookingQuestions: {
          create: existing.bookingQuestions.map((question) => ({
            label: question.label,
            type: question.type,
            isRequired: question.isRequired,
            options: Array.isArray(question.options) ? question.options : Prisma.DbNull,
            order: question.order,
          })),
        },
      },
      include: {
        bookingQuestions: { orderBy: { order: "asc" } },
        schedule: { select: { id: true, name: true, timezone: true } },
      },
    });

    return this.toResponse(duplicated);
  }

  async updateStatus(userId: string, eventTypeId: string, input: EventTypeStatusDto) {
    await this.findOwnedEventType(userId, eventTypeId);

    const updated = await this.prisma.eventType.update({
      where: { id: eventTypeId },
      data: { isActive: input.isActive },
      include: {
        bookingQuestions: { orderBy: { order: "asc" } },
        schedule: { select: { id: true, name: true, timezone: true } },
      },
    });

    return this.toResponse(updated);
  }

  private async findOwnedEventType(userId: string, eventTypeId: string) {
    const eventType = await this.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        userId,
      },
      include: {
        bookingQuestions: { orderBy: { order: "asc" } },
        schedule: { select: { id: true, name: true, timezone: true } },
      },
    });

    if (!eventType) {
      throw new NotFoundException("Event type not found.");
    }

    return eventType;
  }

  private async assertScheduleOwnership(userId: string, scheduleId: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId,
      },
      select: { id: true },
    });

    if (!schedule) {
      throw new NotFoundException("Schedule not found.");
    }
  }

  private async assertSlugAvailable(userId: string, slug: string, excludeId?: string) {
    const existing = await this.prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId,
          slug,
        },
      },
      select: { id: true },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException("Slug is already in use.");
    }
  }

  private validateQuestions(questions: EventTypeQuestionDto[]) {
    const seenIds = new Set<string>();
    const seenOrders = new Set<number>();

    for (const question of questions) {
      if (question.id) {
        if (seenIds.has(question.id)) {
          throw new BadRequestException("bookingQuestions contains duplicate ids.");
        }

        seenIds.add(question.id);
      }

      if (seenOrders.has(question.order)) {
        throw new BadRequestException("bookingQuestions must use unique order values.");
      }

      seenOrders.add(question.order);

      const requiresOptions =
        question.type === BookingQuestionType.SINGLE_SELECT ||
        question.type === BookingQuestionType.MULTI_SELECT;

      if (requiresOptions) {
        if (!question.options?.length) {
          throw new BadRequestException("Select-style booking questions require at least one option.");
        }
      } else if (question.options && question.options.length > 0) {
        throw new BadRequestException("Only select-style booking questions may include options.");
      }
    }
  }

  private async syncQuestions(
    tx: Prisma.TransactionClient,
    eventTypeId: string,
    questions: EventTypeQuestionDto[],
  ) {
    const existingQuestions = await tx.bookingQuestion.findMany({
      where: { eventTypeId },
      select: { id: true },
    });

    const existingIds = new Set(existingQuestions.map((question) => question.id));
    const incomingIds = new Set(questions.filter((question) => question.id).map((question) => question.id as string));

    const idsToDelete = existingQuestions
      .filter((question) => !incomingIds.has(question.id))
      .map((question) => question.id);

    if (idsToDelete.length > 0) {
      await tx.bookingQuestion.deleteMany({
        where: {
          id: { in: idsToDelete },
          eventTypeId,
        },
      });
    }

    for (const question of questions) {
      if (question.id) {
        if (!existingIds.has(question.id)) {
          throw new NotFoundException("Booking question not found.");
        }

        await tx.bookingQuestion.update({
          where: { id: question.id },
          data: {
            label: question.label,
            type: question.type,
            isRequired: question.isRequired,
            options: this.normalizeQuestionOptions(question),
            order: question.order,
          },
        });
      } else {
        await tx.bookingQuestion.create({
          data: {
            eventTypeId,
            label: question.label,
            type: question.type,
            isRequired: question.isRequired,
            options: this.normalizeQuestionOptions(question),
            order: question.order,
          },
        });
      }
    }
  }

  private toQuestionCreateInput(question: EventTypeQuestionDto) {
    return {
      label: question.label,
      type: question.type,
      isRequired: question.isRequired,
      options: this.normalizeQuestionOptions(question),
      order: question.order,
    };
  }

  private normalizeQuestionOptions(question: EventTypeQuestionDto): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    const hasOptions =
      question.type === BookingQuestionType.SINGLE_SELECT ||
      question.type === BookingQuestionType.MULTI_SELECT;

    return hasOptions ? question.options ?? [] : Prisma.DbNull;
  }

  private async generateDuplicateSlug(userId: string, slug: string) {
    const base = `${slug}-copy`;

    for (let suffix = 0; suffix < 50; suffix += 1) {
      const candidate = suffix === 0 ? base : `${base}-${suffix}`;
      const existing = await this.prisma.eventType.findUnique({
        where: {
          userId_slug: {
            userId,
            slug: candidate,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException("Unable to generate a unique duplicate slug.");
  }

  private toResponse(eventType: {
    id: string;
    userId: string;
    title: string;
    slug: string;
    durationMinutes: number;
    description: string | null;
    color: string | null;
    locationType: string;
    locationValue: string | null;
    cancellationPolicy: string | null;
    isActive: boolean;
    minNoticeMins: number;
    maxFutureDays: number;
    bufferBeforeMins: number;
    bufferAfterMins: number;
    dailyLimit: number | null;
    weeklyLimit: number | null;
    scheduleId: string;
    createdAt: Date;
    updatedAt: Date;
    bookingQuestions: Array<{
      id: string;
      label: string;
      type: string;
      isRequired: boolean;
      options: Prisma.JsonValue | null;
      order: number;
    }>;
    schedule: {
      id: string;
      name: string;
      timezone: string;
    };
  }) {
    return {
      id: eventType.id,
      userId: eventType.userId,
      title: eventType.title,
      slug: eventType.slug,
      durationMinutes: eventType.durationMinutes,
      description: eventType.description,
      color: eventType.color,
      locationType: eventType.locationType,
      locationValue: eventType.locationValue,
      cancellationPolicy: eventType.cancellationPolicy,
      isActive: eventType.isActive,
      minNoticeMins: eventType.minNoticeMins,
      maxFutureDays: eventType.maxFutureDays,
      bufferBeforeMins: eventType.bufferBeforeMins,
      bufferAfterMins: eventType.bufferAfterMins,
      dailyLimit: eventType.dailyLimit,
      weeklyLimit: eventType.weeklyLimit,
      scheduleId: eventType.scheduleId,
      schedule: eventType.schedule,
      bookingQuestions: eventType.bookingQuestions.map((question) => ({
        id: question.id,
        label: question.label,
        type: question.type,
        isRequired: question.isRequired,
        options: Array.isArray(question.options) ? question.options : null,
        order: question.order,
      })),
      createdAt: eventType.createdAt,
      updatedAt: eventType.updatedAt,
    };
  }
}
