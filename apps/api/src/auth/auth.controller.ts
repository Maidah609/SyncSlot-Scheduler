import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  BadRequestException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "./decorators/current-user.decorator";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignupDto } from "./dto/signup.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { AuthService } from "./auth.service";
import { OauthCallbackDto } from "./dto/oauth-callback.dto";
import { AuthGuard } from "./guards/auth.guard";
import { GuestGuard } from "./guards/guest.guard";
import { AuthenticatedRequest, AuthenticatedUser } from "./interfaces/authenticated-request.interface";
import { OauthService } from "./oauth.service";
import { RateLimitService } from "./rate-limit.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OauthService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post("signup")
  @UseGuards(GuestGuard)
  async signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @Post("login")
  @HttpCode(200)
  @UseGuards(GuestGuard)
  async login(
    @Body() body: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.rateLimitService.consume(this.rateLimitKey("login", request, body.email), 5, 60_000);

    const result = await this.authService.login(body);

    response.cookie(
      this.authService.getCookieName(),
      result.sessionToken,
      this.authService.getCookieOptions(),
    );

    return {
      user: result.user,
    };
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!request.session) {
      throw new UnauthorizedException("Session is not valid.");
    }

    await this.authService.logout(request.session);
    response.clearCookie(this.authService.getCookieName(), {
      ...this.authService.getCookieOptions(),
      maxAge: undefined,
    });

    return { ok: true };
  }

  @Get("session")
  @UseGuards(AuthGuard)
  async getSession(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (!user) {
      throw new UnauthorizedException("Session is not valid.");
    }

    return { user };
  }

  @Post("verify-email")
  @HttpCode(200)
  @UseGuards(GuestGuard)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @Post("forgot-password")
  @HttpCode(200)
  @UseGuards(GuestGuard)
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.rateLimitService.consume(this.rateLimitKey("forgot-password", request, body.email), 5, 60_000);
    return this.authService.forgotPassword(body.email);
  }

  @Post("reset-password")
  @HttpCode(200)
  @UseGuards(GuestGuard)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get("oauth/google/start")
  @UseGuards(GuestGuard)
  startGoogleOauth(@Res() response: Response) {
    response.redirect(this.oauthService.begin("google", response));
  }

  @Get("oauth/google/callback")
  @UseGuards(GuestGuard)
  async completeGoogleOauth(
    @Query() rawQuery: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.completeOauth("google", this.parseOauthCallbackQuery(rawQuery), request, response);
  }

  @Get("oauth/microsoft/start")
  @UseGuards(GuestGuard)
  startMicrosoftOauth(@Res() response: Response) {
    response.redirect(this.oauthService.begin("microsoft", response));
  }

  @Get("oauth/microsoft/callback")
  @UseGuards(GuestGuard)
  async completeMicrosoftOauth(
    @Query() rawQuery: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.completeOauth("microsoft", this.parseOauthCallbackQuery(rawQuery), request, response);
  }

  private rateLimitKey(action: string, request: AuthenticatedRequest, email: string) {
    const ip = request.ip || request.headers["x-forwarded-for"] || "unknown";
    const normalizedIp = Array.isArray(ip) ? ip[0] : String(ip);
    return `${action}:${normalizedIp}:${email}`;
  }

  private async completeOauth(
    provider: "google" | "microsoft",
    query: OauthCallbackDto,
    request: AuthenticatedRequest,
    response: Response,
  ) {
    if (query.error) {
      throw new UnauthorizedException(query.error_description ?? `${provider} OAuth login was denied.`);
    }

    const result = await this.oauthService.complete(
      provider,
      query.code,
      query.state,
      request.cookies?.[`syncslot_oauth_state_${provider}`],
      response,
    );
    const session = await this.authService.loginWithUser(result.user);

    response.cookie(
      this.authService.getCookieName(),
      session.sessionToken,
      this.authService.getCookieOptions(),
    );

    return {
      user: session.user,
    };
  }

  private parseOauthCallbackQuery(rawQuery: Record<string, unknown>): OauthCallbackDto {
    const query = {
      code: this.readOptionalString(rawQuery.code, "code"),
      state: this.readOptionalString(rawQuery.state, "state"),
      error: this.readOptionalString(rawQuery.error, "error"),
      error_description: this.readOptionalString(rawQuery.error_description, "error_description"),
    } satisfies OauthCallbackDto;

    return query;
  }

  private readOptionalString(value: unknown, field: string) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === "string") {
      return value;
    }

    throw new BadRequestException(`${field} must be a string.`);
  }
}
