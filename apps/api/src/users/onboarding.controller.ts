import { Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-request.interface";
import { UsersService } from "./users.service";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly usersService: UsersService) {}

  @Post("complete")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async complete(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.usersService.completeOnboarding(this.usersService.requireAuthenticatedUser(user).id);
  }
}
