import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[this.authService.getCookieName()];

    if (!token) {
      throw new UnauthorizedException("Session is not valid.");
    }

    const session = await this.authService.verifySessionToken(token);
    const user = await this.authService.getAuthenticatedUser(session.sub);

    request.session = session;
    request.user = user;

    return true;
  }
}
