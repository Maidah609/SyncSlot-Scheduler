import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

type AttemptWindow = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitService {
  private readonly attempts = new Map<string, AttemptWindow>();

  consume(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return;
    }

    if (current.count >= limit) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      throw new HttpException({
        message: `Too many attempts. Retry in ${retryAfterSeconds} seconds.`,
        error: "Too Many Requests",
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
  }
}
