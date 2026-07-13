import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthSessionService {
  private readonly revokedSessions = new Map<string, number>();

  revokeSession(jti: string, expiresAtMs: number) {
    this.revokedSessions.set(jti, expiresAtMs);
  }

  isRevoked(jti: string) {
    this.pruneExpired();
    return this.revokedSessions.has(jti);
  }

  private pruneExpired() {
    const now = Date.now();

    for (const [jti, expiresAt] of this.revokedSessions.entries()) {
      if (expiresAt <= now) {
        this.revokedSessions.delete(jti);
      }
    }
  }
}
