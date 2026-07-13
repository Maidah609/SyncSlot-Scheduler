import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";

@Injectable()
export class GuestGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[this.authService.getCookieName()];

    if (!token) {
      return true;
    }

    try {
      await this.authService.verifySessionToken(token);
    } catch {
      return true;
    }

    throw new UnauthorizedException("This endpoint is only available to guests.");
  }
}
