import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { loadEnvConfig } from "@syncslot/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthSessionService } from "./auth-session.service";
import { AuthGuard } from "./guards/auth.guard";
import { GuestGuard } from "./guards/guest.guard";
import { OauthService } from "./oauth.service";
import { RateLimitService } from "./rate-limit.service";

const env = loadEnvConfig();

@Module({
  imports: [
    JwtModule.register({
      secret: env.JWT_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthSessionService, OauthService, RateLimitService, AuthGuard, GuestGuard],
  exports: [AuthService, AuthGuard, GuestGuard],
})
export class AuthModule {}
