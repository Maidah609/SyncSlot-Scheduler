import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, PrismaService } from "@syncslot/database";
import { CreateOverrideDto } from "./dto/create-override.dto";
import { CreateRuleDto } from "./dto/create-rule.dto";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateOverrideDto } from "./dto/update-override.dto";
import { UpdateRuleDto } from "./dto/update-rule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";

type ScheduleWithRelations = Prisma.ScheduleGetPayload<{
  include: {
    availabilityRules: true;
    dateOverrides: true;
  };
}>;

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const schedules = await this.prisma.schedule.findMany({
      where: { userId },
      include: {
        availabilityRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        dateOverrides: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    return schedules.map((schedule) => this.toResponse(schedule));
  }

  async create(userId: string, input: CreateScheduleDto) {
    const existingCount = await this.prisma.schedule.count({
      where: { userId },
    });
    const shouldBeDefault = input.isDefault ?? existingCount === 0;

    const schedule = await this.prisma.withTransaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.schedule.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.schedule.create({
        data: {
          userId,
          name: input.name,
          timezone: input.timezone,
          isDefault: shouldBeDefault,
        },
        include: {
          availabilityRules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
          dateOverrides: { orderBy: { date: "asc" } },
        },
      });
    });

    return this.toResponse(schedule);
  }

  async getById(userId: string, scheduleId: string) {
    const schedule = await this.findOwnedSchedule(userId, scheduleId);
    return this.toResponse(schedule);
  }

  async update(userId: string, scheduleId: string, input: UpdateScheduleDto) {
    await this.findOwnedSchedule(userId, scheduleId);

    const schedule = await this.prisma.withTransaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.schedule.updateMany({
          where: {
            userId,
            NOT: { id: scheduleId },
          },
          data: { isDefault: false },
        });
      }

      const updated = await tx.schedule.update({
        where: { id: scheduleId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        },
      });

      if (input.isDefault === false) {
        const defaultCount = await tx.schedule.count({
          where: {
            userId,
            isDefault: true,
          },
        });

        if (defaultCount === 0) {
          await tx.schedule.update({
            where: { id: scheduleId },
            data: { isDefault: true },
          });
        }
      }

      return tx.schedule.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          availabilityRules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
          dateOverrides: { orderBy: { date: "asc" } },
        },
      });
    });

    return this.toResponse(schedule);
  }

  async remove(userId: string, scheduleId: string) {
    const schedule = await this.findOwnedSchedule(userId, scheduleId);

    const eventTypeCount = await this.prisma.eventType.count({
      where: {
        userId,
        scheduleId,
      },
    });

    if (eventTypeCount > 0) {
      throw new ConflictException("Schedule cannot be deleted while event types are assigned to it.");
    }

    await this.prisma.withTransaction(async (tx) => {
      await tx.schedule.delete({
        where: { id: scheduleId },
      });

      if (schedule.isDefault) {
        const replacement = await tx.schedule.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
        });

        if (replacement) {
          await tx.schedule.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { ok: true };
  }

  async createRule(userId: string, scheduleId: string, input: CreateRuleDto) {
    if (input.dayOfWeek > 6) {
      throw new BadRequestException("dayOfWeek must be between 0 and 6.");
    }

    await this.findOwnedSchedule(userId, scheduleId);
    this.assertValidTimeRange(input.startTime, input.endTime);
    await this.assertNoRuleOverlap(scheduleId, input.dayOfWeek, input.startTime, input.endTime);

    const rule = await this.prisma.availabilityRule.create({
      data: {
        scheduleId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });

    return rule;
  }

  async updateRule(userId: string, scheduleId: string, ruleId: string, input: UpdateRuleDto) {
    await this.findOwnedSchedule(userId, scheduleId);

    const existing = await this.prisma.availabilityRule.findFirst({
      where: {
        id: ruleId,
        scheduleId,
      },
    });

    if (!existing) {
      throw new NotFoundException("Availability rule not found.");
    }

    const startTime = input.startTime ?? existing.startTime;
    const endTime = input.endTime ?? existing.endTime;

    this.assertValidTimeRange(startTime, endTime);
    await this.assertNoRuleOverlap(scheduleId, existing.dayOfWeek, startTime, endTime, ruleId);

    return this.prisma.availabilityRule.update({
      where: { id: ruleId },
      data: {
        ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      },
    });
  }

  async removeRule(userId: string, scheduleId: string, ruleId: string) {
    await this.findOwnedSchedule(userId, scheduleId);

    const existing = await this.prisma.availabilityRule.findFirst({
      where: {
        id: ruleId,
        scheduleId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Availability rule not found.");
    }

    await this.prisma.availabilityRule.delete({
      where: { id: ruleId },
    });

    return { ok: true };
  }

  async createOverride(userId: string, scheduleId: string, input: CreateOverrideDto) {
    await this.findOwnedSchedule(userId, scheduleId);
    this.validateOverride(input);

    return this.prisma.dateOverride.create({
      data: {
        scheduleId,
        date: this.toDateOnly(input.date),
        isClosed: input.isClosed,
        startTime: input.isClosed ? null : input.startTime ?? null,
        endTime: input.isClosed ? null : input.endTime ?? null,
      },
    });
  }

  async updateOverride(userId: string, scheduleId: string, overrideId: string, input: UpdateOverrideDto) {
    await this.findOwnedSchedule(userId, scheduleId);

    const existing = await this.prisma.dateOverride.findFirst({
      where: {
        id: overrideId,
        scheduleId,
      },
    });

    if (!existing) {
      throw new NotFoundException("Date override not found.");
    }

    const candidate = {
      date: input.date ?? existing.date.toISOString().slice(0, 10),
      isClosed: input.isClosed ?? existing.isClosed,
      startTime: input.startTime !== undefined ? input.startTime : existing.startTime,
      endTime: input.endTime !== undefined ? input.endTime : existing.endTime,
    };

    this.validateOverride(candidate);

    return this.prisma.dateOverride.update({
      where: { id: overrideId },
      data: {
        ...(input.date !== undefined ? { date: this.toDateOnly(input.date) } : {}),
        ...(input.isClosed !== undefined ? { isClosed: input.isClosed } : {}),
        ...(input.startTime !== undefined || candidate.isClosed ? { startTime: candidate.isClosed ? null : candidate.startTime ?? null } : {}),
        ...(input.endTime !== undefined || candidate.isClosed ? { endTime: candidate.isClosed ? null : candidate.endTime ?? null } : {}),
      },
    });
  }

  async removeOverride(userId: string, scheduleId: string, overrideId: string) {
    await this.findOwnedSchedule(userId, scheduleId);

    const existing = await this.prisma.dateOverride.findFirst({
      where: {
        id: overrideId,
        scheduleId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Date override not found.");
    }

    await this.prisma.dateOverride.delete({
      where: { id: overrideId },
    });

    return { ok: true };
  }

  async ensureDefaultSchedule(userId: string, timezone = "UTC") {
    const existing = await this.prisma.schedule.findFirst({
      where: { userId },
    });

    if (existing) {
      if (!existing.isDefault) {
        await this.prisma.schedule.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
        await this.prisma.schedule.update({
          where: { id: existing.id },
          data: { isDefault: true },
        });
      }
      return existing;
    }

    return this.prisma.schedule.create({
      data: {
        userId,
        name: "Default Schedule",
        timezone,
        isDefault: true,
        availabilityRules: {
          create: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
          ],
        },
      },
    });
  }

  private async findOwnedSchedule(userId: string, scheduleId: string): Promise<ScheduleWithRelations> {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId,
      },
      include: {
        availabilityRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        dateOverrides: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException("Schedule not found.");
    }

    return schedule;
  }

  private validateOverride(input: {
    isClosed: boolean;
    startTime?: string | null;
    endTime?: string | null;
  }) {
    if (input.isClosed) {
      return;
    }

    if (!input.startTime || !input.endTime) {
      throw new BadRequestException("Custom-hour overrides require both startTime and endTime.");
    }

    this.assertValidTimeRange(input.startTime, input.endTime);
  }

  private async assertNoRuleOverlap(
    scheduleId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeRuleId?: string,
  ) {
    const rules = await this.prisma.availabilityRule.findMany({
      where: {
        scheduleId,
        dayOfWeek,
        ...(excludeRuleId ? { NOT: { id: excludeRuleId } } : {}),
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    for (const rule of rules) {
      const ruleStart = this.timeToMinutes(rule.startTime);
      const ruleEnd = this.timeToMinutes(rule.endTime);

      if (start < ruleEnd && end > ruleStart) {
        throw new ConflictException("Availability intervals cannot overlap within the same day.");
      }
    }
  }

  private assertValidTimeRange(startTime: string, endTime: string) {
    if (this.timeToMinutes(endTime) <= this.timeToMinutes(startTime)) {
      throw new BadRequestException("endTime must be later than startTime.");
    }
  }

  private timeToMinutes(value: string) {
    const [hours, minutes] = value.split(":").map(Number);
    return (hours * 60) + minutes;
  }

  private toDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toResponse(schedule: ScheduleWithRelations) {
    return {
      id: schedule.id,
      userId: schedule.userId,
      name: schedule.name,
      isDefault: schedule.isDefault,
      timezone: schedule.timezone,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      availabilityRules: schedule.availabilityRules.map((rule) => ({
        id: rule.id,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
      })),
      dateOverrides: schedule.dateOverrides.map((override) => ({
        id: override.id,
        date: override.date.toISOString().slice(0, 10),
        isClosed: override.isClosed,
        startTime: override.startTime,
        endTime: override.endTime,
      })),
    };
  }
}
