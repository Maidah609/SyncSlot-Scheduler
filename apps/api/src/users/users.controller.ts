import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-request.interface";
import { CheckUsernameDto } from "./dto/check-username.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("check-username")
  async checkUsername(@Query() query: CheckUsernameDto) {
    return this.usersService.isUsernameAvailable(query.value);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.usersService.getCurrentUser(this.usersService.requireAuthenticatedUser(user).id);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  async updateMe(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: UpdateMeDto,
  ) {
    return this.usersService.updateCurrentUser(this.usersService.requireAuthenticatedUser(user).id, body);
  }
}
