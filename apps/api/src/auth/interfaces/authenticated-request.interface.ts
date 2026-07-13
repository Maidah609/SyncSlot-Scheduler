import { Request } from "express";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  title: string;
  welcome: string;
  timezone: string;
  emailVerifiedAt: Date | null;
  onboardingCompletedAt: Date | null;
};

export type SessionPayload = {
  sub: string;
  jti: string;
  email: string;
  type: "session";
};

export type AuthenticatedRequest = Request & {
  cookies: Record<string, string | undefined>;
  user?: AuthenticatedUser;
  session?: SessionPayload;
};
