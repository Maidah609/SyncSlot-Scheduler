import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { PublicBookingsController } from "./public-bookings.controller";

@Module({
  imports: [AuthModule, UsersModule, NotificationsModule],
  controllers: [BookingsController, PublicBookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
