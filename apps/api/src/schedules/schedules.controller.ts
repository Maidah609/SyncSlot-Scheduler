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
import { CreateOverrideDto } from "./dto/create-override.dto";
import { CreateRuleDto } from "./dto/create-rule.dto";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateOverrideDto } from "./dto/update-override.dto";
import { UpdateRuleDto } from "./dto/update-rule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { SchedulesService } from "./schedules.service";

@Controller("schedules")
@UseGuards(AuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser | undefined): Promise<unknown> {
    return this.schedulesService.listForUser(this.requireUser(user).id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: CreateScheduleDto,
  ): Promise<unknown> {
    return this.schedulesService.create(this.requireUser(user).id, body);
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
  ): Promise<unknown> {
    return this.schedulesService.getById(this.requireUser(user).id, id);
  }

  @Patch(":id")
  @HttpCode(200)
  async update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() body: UpdateScheduleDto,
  ): Promise<unknown> {
    return this.schedulesService.update(this.requireUser(user).id, id, body);
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
  ): Promise<{ ok: boolean }> {
    return this.schedulesService.remove(this.requireUser(user).id, id);
  }

  @Post(":id/rules")
  async createRule(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() body: CreateRuleDto,
  ): Promise<unknown> {
    return this.schedulesService.createRule(this.requireUser(user).id, id, body);
  }

  @Patch(":id/rules/:ruleId")
  @HttpCode(200)
  async updateRule(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Param("ruleId") ruleId: string,
    @Body() body: UpdateRuleDto,
  ): Promise<unknown> {
    return this.schedulesService.updateRule(this.requireUser(user).id, id, ruleId, body);
  }

  @Delete(":id/rules/:ruleId")
  @HttpCode(200)
  async removeRule(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Param("ruleId") ruleId: string,
  ): Promise<{ ok: boolean }> {
    return this.schedulesService.removeRule(this.requireUser(user).id, id, ruleId);
  }

  @Post(":id/overrides")
  async createOverride(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() body: CreateOverrideDto,
  ): Promise<unknown> {
    return this.schedulesService.createOverride(this.requireUser(user).id, id, body);
  }

  @Patch(":id/overrides/:overrideId")
  @HttpCode(200)
  async updateOverride(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Param("overrideId") overrideId: string,
    @Body() body: UpdateOverrideDto,
  ): Promise<unknown> {
    return this.schedulesService.updateOverride(this.requireUser(user).id, id, overrideId, body);
  }

  @Delete(":id/overrides/:overrideId")
  @HttpCode(200)
  async removeOverride(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Param("overrideId") overrideId: string,
  ): Promise<{ ok: boolean }> {
    return this.schedulesService.removeOverride(this.requireUser(user).id, id, overrideId);
  }

  private requireUser(user: AuthenticatedUser | undefined) {
    if (!user) {
      throw new UnauthorizedException("Session is not valid.");
    }

    return user;
  }
}
