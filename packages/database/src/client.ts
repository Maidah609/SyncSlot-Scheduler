import { PrismaClient } from "@prisma/client";
export {
  BookingAuditAction,
  BookingAuditActorType,
  BookingQuestionType,
  BookingStatus,
  CalendarProvider,
  LocationType,
  NotificationDeliveryStatus,
  Prisma,
} from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}

export { PrismaClient };
