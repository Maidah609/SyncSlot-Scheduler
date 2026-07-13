import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-request.interface";
import { CreateEventTypeDto } from "./dto/create-event-type.dto";
import { EventTypeStatusDto } from "./dto/event-type-status.dto";
import { UpdateEventTypeDto } from "./dto/update-event-type.dto";
import { EventTypesService } from "./event-types.service";

@Controller("event-types")
@UseGuards(AuthGuard)
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser | undefined): Promise<unknown> {
    return this.eventTypesService.listForUser(this.requireUser(user).id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: CreateEventTypeDto,
  ): Promise<unknown> {
    return this.eventTypesService.create(this.requireUser(user).id, body);
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
  ): Promise<unknown> {
    return this.eventTypesService.getById(this.requireUser(user).id, id);
  }

  @Patch(":id")
  @HttpCode(200)
  async update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() body: UpdateEventTypeDto,
  ): Promise<unknown> {
    return this.eventTypesService.update(this.requireUser(user).id, id, body);
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
  ): Promise<{ ok: boolean }> {
    return this.eventTypesService.remove(this.requireUser(user).id, id);
  }

  @Post(":id/duplicate")
  @HttpCode(200)
  async duplicate(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
  ): Promise<unknown> {
    return this.eventTypesService.duplicate(this.requireUser(user).id, id);
  }

  @Patch(":id/status")
  @HttpCode(200)
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() body: EventTypeStatusDto,
  ): Promise<unknown> {
    return this.eventTypesService.updateStatus(this.requireUser(user).id, id, body);
  }

  private requireUser(user: AuthenticatedUser | undefined) {
    if (!user) {
      throw new UnauthorizedException("Session is not valid.");
    }

    return user;
  }
}
