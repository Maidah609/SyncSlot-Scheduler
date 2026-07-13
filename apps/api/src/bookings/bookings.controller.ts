import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-request.interface";
import { UsersService } from "../users/users.service";
import { BookingsService } from "./bookings.service";
import { BookingListQueryDto } from "./dto/booking-list-query.dto";
import { CancelBookingDto } from "./dto/cancel-booking.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";
import { UpdateBookingNotesDto } from "./dto/update-booking-notes.dto";

@Controller("bookings")
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly usersService: UsersService,
  ) {}

  @Get("export.csv")
  @UseGuards(AuthGuard)
  @Header("Content-Type", "text/csv; charset=utf-8")
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: BookingListQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Content-Disposition", "attachment; filename=\"bookings.csv\"");
    return this.bookingsService.exportCsv(this.usersService.requireAuthenticatedUser(user).id, query);
  }

  @Get()
  @UseGuards(AuthGuard)
  async list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: BookingListQueryDto,
  ) {
    return this.bookingsService.listForHost(this.usersService.requireAuthenticatedUser(user).id, query);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async getById(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
  ) {
    return this.bookingsService.getById(this.usersService.requireAuthenticatedUser(user).id, id);
  }

  @Patch(":id/notes")
  @UseGuards(AuthGuard)
  async updateNotes(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() body: UpdateBookingNotesDto,
  ) {
    return this.bookingsService.updateNotes(this.usersService.requireAuthenticatedUser(user).id, id, body);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async cancelByHost(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() body: CancelBookingDto,
  ) {
    return this.bookingsService.cancelByHost(this.usersService.requireAuthenticatedUser(user).id, id, body);
  }

  @Post(":id/reschedule")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async rescheduleByHost(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() body: RescheduleBookingDto,
  ) {
    return this.bookingsService.rescheduleByHost(this.usersService.requireAuthenticatedUser(user).id, id, body);
  }
}
