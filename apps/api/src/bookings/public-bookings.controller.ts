import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { CancelBookingDto } from "./dto/cancel-booking.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";

@Controller("public/bookings")
export class PublicBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get(":token")
  async getByToken(@Param("token") token: string) {
    return this.bookingsService.getByPublicToken(token);
  }

  @Post(":token/reschedule")
  @HttpCode(200)
  async rescheduleByToken(
    @Param("token") token: string,
    @Body() body: RescheduleBookingDto,
  ) {
    return this.bookingsService.rescheduleByPublicToken(token, body);
  }

  @Post(":token/cancel")
  @HttpCode(200)
  async cancelByToken(
    @Param("token") token: string,
    @Body() body: CancelBookingDto,
  ) {
    return this.bookingsService.cancelByPublicToken(token, body);
  }
}
