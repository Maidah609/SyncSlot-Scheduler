import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CreatePublicBookingDto } from "./dto/create-public-booking.dto";
import { PublicSlotsQueryDto } from "./dto/public-slots-query.dto";
import { PublicBookingService } from "./public-booking.service";

@Controller("public")
export class PublicController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get(":username/:eventSlug")
  async getPublicEvent(
    @Param("username") username: string,
    @Param("eventSlug") eventSlug: string,
  ): Promise<unknown> {
    return this.publicBookingService.getPublicEvent(username, eventSlug);
  }

  @Get(":username/:eventSlug/slots")
  async getPublicSlots(
    @Param("username") username: string,
    @Param("eventSlug") eventSlug: string,
    @Query() query: PublicSlotsQueryDto,
  ): Promise<unknown> {
    return this.publicBookingService.getPublicSlots(username, eventSlug, query);
  }

  @Post(":username/:eventSlug/book")
  async createPublicBooking(
    @Param("username") username: string,
    @Param("eventSlug") eventSlug: string,
    @Body() body: CreatePublicBookingDto,
  ): Promise<unknown> {
    return this.publicBookingService.createPublicBooking(username, eventSlug, body);
  }

  @Get(":username")
  async getPublicProfile(@Param("username") username: string): Promise<unknown> {
    return this.publicBookingService.getPublicProfile(username);
  }
}
