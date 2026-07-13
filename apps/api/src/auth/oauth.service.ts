import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { loadEnvConfig } from "@syncslot/config";
import { CalendarProvider, Prisma, PrismaService } from "@syncslot/database";
import { Response } from "express";
import {
  OAUTH_STATE_COOKIE_PREFIX,
  OAUTH_STATE_TTL_SECONDS,
} from "./auth.constants";
import { AuthenticatedUser } from "./interfaces/authenticated-request.interface";
import { OauthProvider, OauthProviderUser } from "./oauth.types";
import { slugifyUsernameInput } from "./auth.utils";

const env = loadEnvConfig();

type OauthStatePayload = {
  provider: OauthProvider;
  nonce: string;
  type: "oauth_state";
};

type OauthTokenResponse = {
  access_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserinfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

type MicrosoftUserinfoResponse = {
  sub?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
};

@Injectable()
export class OauthService {
  private readonly logger = new Logger(OauthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  begin(provider: OauthProvider, response: Response) {
    const nonce = randomBytes(24).toString("hex");
    const state = this.jwtService.sign(
      {
        provider,
        nonce,
        type: "oauth_state",
      } satisfies OauthStatePayload,
      {
        secret: env.SESSION_SECRET,
        expiresIn: OAUTH_STATE_TTL_SECONDS,
      },
    );

    response.cookie(this.getStateCookieName(provider), this.hashNonce(nonce), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: OAUTH_STATE_TTL_SECONDS * 1000,
    });

    return this.buildAuthorizationUrl(provider, state);
  }

  async complete(
    provider: OauthProvider,
    code: string | undefined,
    state: string | undefined,
    cookieValue: string | undefined,
    response: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException("OAuth callback is missing the required code or state.");
    }

    this.verifyState(provider, state, cookieValue, response);
    const token = await this.exchangeCodeForToken(provider, code);
    const profile = await this.fetchProviderUser(provider, token);

    if (!profile.emailVerified) {
      throw new UnauthorizedException("OAuth provider did not return a verified email address.");
    }

    const user = await this.linkOrCreateUser(provider, profile);
    this.logger.log(`OAuth login succeeded for ${provider}:${profile.email}`);

    return {
      user: this.toAuthenticatedUser(user),
      email: profile.email,
    };
  }

  clearStateCookie(provider: OauthProvider, response: Response) {
    response.clearCookie(this.getStateCookieName(provider), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  }

  private verifyState(
    provider: OauthProvider,
    state: string,
    cookieValue: string | undefined,
    response: Response,
  ) {
    let payload: OauthStatePayload;

    try {
      payload = this.jwtService.verify<OauthStatePayload>(state, {
        secret: env.SESSION_SECRET,
      });
    } catch {
      throw new UnauthorizedException("OAuth state is invalid or expired.");
    }

    if (payload.type !== "oauth_state" || payload.provider !== provider) {
      throw new UnauthorizedException("OAuth state is invalid or expired.");
    }

    this.clearStateCookie(provider, response);

    if (!cookieValue) {
      throw new UnauthorizedException("OAuth state cookie is missing or expired.");
    }

    const expected = Buffer.from(cookieValue, "hex");
    const actual = Buffer.from(this.hashNonce(payload.nonce), "hex");

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException("OAuth state validation failed.");
    }

    return payload.nonce;
  }

  private buildAuthorizationUrl(provider: OauthProvider, state: string) {
    if (provider === "google") {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        redirect_uri: env.GOOGLE_OAUTH_CALLBACK_URL,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "consent",
        state,
      }).toString();

      return url.toString();
    }

    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    url.search = new URLSearchParams({
      client_id: env.MICROSOFT_OAUTH_CLIENT_ID,
      redirect_uri: env.MICROSOFT_OAUTH_CALLBACK_URL,
      response_type: "code",
      scope: "openid profile email User.Read",
      response_mode: "query",
      state,
    }).toString();

    return url.toString();
  }

  private async exchangeCodeForToken(provider: OauthProvider, code: string) {
    const isGoogle = provider === "google";
    const url = isGoogle
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";

    const body = new URLSearchParams({
      client_id: isGoogle ? env.GOOGLE_OAUTH_CLIENT_ID : env.MICROSOFT_OAUTH_CLIENT_ID,
      client_secret: isGoogle ? env.GOOGLE_OAUTH_CLIENT_SECRET : env.MICROSOFT_OAUTH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: isGoogle ? env.GOOGLE_OAUTH_CALLBACK_URL : env.MICROSOFT_OAUTH_CALLBACK_URL,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await response.json() as OauthTokenResponse;

    if (!response.ok || !data.access_token) {
      this.logger.warn(`OAuth token exchange failed for ${provider}: ${data.error_description ?? data.error ?? response.statusText}`);
      throw new UnauthorizedException("OAuth token exchange failed.");
    }

    return data.access_token;
  }

  private async fetchProviderUser(provider: OauthProvider, accessToken: string): Promise<OauthProviderUser> {
    if (provider === "google") {
      const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json() as GoogleUserinfoResponse;

      if (!response.ok || !data.sub || !data.email) {
        throw new UnauthorizedException("Google did not return a usable profile.");
      }

      return {
        providerAccountId: data.sub,
        email: data.email.toLowerCase(),
        name: data.name?.trim() || data.email.split("@")[0],
        emailVerified: data.email_verified === true,
      };
    }

    const response = await fetch("https://graph.microsoft.com/oidc/userinfo", {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json() as MicrosoftUserinfoResponse;
    const email = data.email?.trim() || data.preferred_username?.trim();

    if (!response.ok || !data.sub || !email) {
      throw new UnauthorizedException("Microsoft did not return a usable profile.");
    }

    return {
      providerAccountId: data.sub,
      email: email.toLowerCase(),
      name: data.name?.trim() || email.split("@")[0],
      emailVerified: true,
    };
  }

  private async linkOrCreateUser(provider: OauthProvider, profile: OauthProviderUser) {
    const prismaProvider = provider === "google" ? CalendarProvider.GOOGLE : CalendarProvider.MICROSOFT;

    return this.prisma.withTransaction(async (tx) => {
      const linkedAccount = await tx.credentialAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: prismaProvider,
            providerAccountId: profile.providerAccountId,
          },
        },
        include: {
          user: true,
        },
      });

      if (linkedAccount) {
        if (linkedAccount.user.name !== profile.name || !linkedAccount.user.emailVerifiedAt) {
          await tx.user.update({
            where: { id: linkedAccount.userId },
            data: {
              emailVerifiedAt: linkedAccount.user.emailVerifiedAt ?? new Date(),
              name: profile.name,
            },
          });
        }

        return tx.user.findUniqueOrThrow({
          where: { id: linkedAccount.userId },
        });
      }

      const existingUser = await tx.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        await tx.credentialAccount.create({
          data: {
            provider: prismaProvider,
            providerAccountId: profile.providerAccountId,
            userId: existingUser.id,
          },
        });

        return tx.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
            name: existingUser.name || profile.name,
          },
        });
      }

      const username = await this.generateUniqueUsername(profile.name, tx);

      return tx.user.create({
        data: {
          email: profile.email,
          emailVerifiedAt: new Date(),
          name: profile.name,
          username,
          timezone: "UTC",
          onboardingCompletedAt: null,
          credentialAccounts: {
            create: {
              provider: prismaProvider,
              providerAccountId: profile.providerAccountId,
            },
          },
        },
      });
    });
  }

  private async generateUniqueUsername(
    name: string,
    tx: Prisma.TransactionClient,
  ) {
    const normalizedBase = slugifyUsernameInput(name).slice(0, 32) || "user";

    for (let suffix = 0; suffix < 25; suffix += 1) {
      const candidate = suffix === 0 ? normalizedBase : `${normalizedBase}-${suffix}`;
      const exists = await tx.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });

      if (!exists) {
        return candidate;
      }
    }

    return `${normalizedBase}-${randomBytes(3).toString("hex")}`;
  }

  private getStateCookieName(provider: OauthProvider) {
    return `${OAUTH_STATE_COOKIE_PREFIX}_${provider}`;
  }

  private hashNonce(nonce: string) {
    return createHash("sha256").update(nonce).digest("hex");
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
