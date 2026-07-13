import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OnboardingController } from "./onboarding.controller";
import { PublicController } from "./public.controller";
import { PublicBookingService } from "./public-booking.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [UsersController, OnboardingController, PublicController],
  providers: [UsersService, PublicBookingService],
  exports: [UsersService],
})
export class UsersModule {}
