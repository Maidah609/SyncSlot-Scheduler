import { randomBytes, randomUUID } from "node:crypto";
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@syncslot/database";
import * as argon2 from "argon2";
import {
  AUTH_COOKIE_NAME,
  EMAIL_VERIFICATION_TTL_HOURS,
  PASSWORD_RESET_TTL_HOURS,
  SESSION_TTL_SECONDS,
} from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";
import { AuthenticatedUser, SessionPayload } from "./interfaces/authenticated-request.interface";
import { AuthSessionService } from "./auth-session.service";
import { slugifyUsernameInput } from "./auth.utils";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async signup(input: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException("Email is already in use.");
    }

    const passwordHash = await argon2.hash(input.password);
    const username = await this.generateUniqueUsername(input.name);

    const result = await this.prisma.withTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          username,
          timezone: "UTC",
        },
      });

      const token = randomBytes(32).toString("hex");

      const verificationToken = await tx.emailVerificationToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt: this.hoursFromNow(EMAIL_VERIFICATION_TTL_HOURS),
        },
      });

      return {
        user: this.toAuthenticatedUser(user),
        verificationToken,
      };
    });

    this.logger.log(`Email verification token for ${result.user.email}: ${result.verificationToken.token}`);

    return {
      user: result.user,
      verificationTokenCreated: true,
    };
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await argon2.verify(user.passwordHash, input.password);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const session = await this.createSession(user.id, user.email);

    return {
      user: this.toAuthenticatedUser(user),
      ...session,
    };
  }

  async loginWithUser(user: {
    id: string;
    email: string;
    name: string;
    username: string;
    title: string;
    welcome: string;
    timezone: string;
    emailVerifiedAt: Date | null;
    onboardingCompletedAt: Date | null;
  }) {
    const session = await this.createSession(user.id, user.email);

    return {
      user: this.toAuthenticatedUser(user),
      ...session,
    };
  }

  async logout(session: SessionPayload & { exp?: number }) {
    const expiresAtMs = session.exp ? session.exp * 1000 : Date.now() + SESSION_TTL_SECONDS * 1000;
    this.authSessionService.revokeSession(session.jti, expiresAtMs);
  }

  async getAuthenticatedUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("Session is no longer valid.");
    }

    return this.toAuthenticatedUser(user);
  }

  async verifyEmail(token: string) {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt <= new Date()) {
      throw new UnauthorizedException("Verification token is invalid or expired.");
    }

    await this.prisma.withTransaction(async (tx) => {
      await tx.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: new Date() },
      });

      await tx.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      });
    });

    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { ok: true };
    }

    const token = randomBytes(32).toString("hex");

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: this.hoursFromNow(PASSWORD_RESET_TTL_HOURS),
      },
    });

    this.logger.log(`Password reset token for ${user.email}: ${token}`);

    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const passwordResetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!passwordResetToken || passwordResetToken.usedAt || passwordResetToken.expiresAt <= new Date()) {
      throw new UnauthorizedException("Password reset token is invalid or expired.");
    }

    const passwordHash = await argon2.hash(password);

    await this.prisma.withTransaction(async (tx) => {
      await tx.user.update({
        where: { id: passwordResetToken.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: passwordResetToken.id },
        data: { usedAt: new Date() },
      });
    });

    return { ok: true };
  }

  async isUsernameAvailable(username: string) {
    const existing = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return { available: !existing };
  }

  async verifySessionToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<SessionPayload & { exp: number }>(token);

      if (payload.type !== "session" || this.authSessionService.isRevoked(payload.jti)) {
        throw new UnauthorizedException("Session is not valid.");
      }

      return payload;
    } catch {
      throw new UnauthorizedException("Session is not valid.");
    }
  }

  getCookieName() {
    return AUTH_COOKIE_NAME;
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_TTL_SECONDS * 1000,
    };
  }

  private async createSession(userId: string, email: string) {
    const payload: SessionPayload = {
      sub: userId,
      jti: randomUUID(),
      email,
      type: "session",
    };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: SESSION_TTL_SECONDS,
    });

    return {
      sessionToken: token,
      sessionPayload: payload,
    };
  }

  private async generateUniqueUsername(name: string) {
    const base = slugifyUsernameInput(name) || "user";

    for (let suffix = 0; suffix < 25; suffix += 1) {
      const candidate = suffix === 0 ? base : `${base}-${suffix}`;
      const exists = await this.prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });

      if (!exists) {
        return candidate;
      }
    }

    return `${base}-${randomBytes(3).toString("hex")}`;
  }

  private hoursFromNow(hours: number) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    name: string;
    username: string;
    title: string;
    welcome: string;
    timezone: string;
    emailVerifiedAt: Date | null;
    onboardingCompletedAt: Date | null;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      title: user.title,
      welcome: user.welcome,
      timezone: user.timezone,
      emailVerifiedAt: user.emailVerifiedAt,
      onboardingCompletedAt: user.onboardingCompletedAt,
    };
  }
}
