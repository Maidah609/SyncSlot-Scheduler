import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue, QueueEvents } from "bullmq";
import { loadEnvConfig } from "@syncslot/config";
import { NOTIFICATIONS_QUEUE_NAME, NOTIFICATIONS_QUEUE_PREFIX } from "./notifications.constants";
import type { NotificationJobData } from "./notifications.types";

type QueueJob = {
  name: string;
  data: NotificationJobData;
  opts: {
    attempts: number;
    backoff: { type: "exponential"; delay: number };
    jobId: string;
    delay?: number;
    removeOnComplete?: boolean;
    removeOnFail?: boolean | number;
  };
};

@Injectable()
export class NotificationsQueueService implements OnModuleDestroy {
  private readonly env = loadEnvConfig();
  private readonly prefix = process.env.SYNCSLOT_NOTIFICATION_QUEUE_PREFIX?.trim()
    || (this.env.NODE_ENV === "test"
    ? `${NOTIFICATIONS_QUEUE_PREFIX}-test-${process.pid}`
    : NOTIFICATIONS_QUEUE_PREFIX);
  private readonly connection = {
    url: this.env.REDIS_URL,
    maxRetriesPerRequest: null,
  } as const;
  private readonly queue = new Queue<NotificationJobData, void, string>(NOTIFICATIONS_QUEUE_NAME, {
    connection: this.connection,
    prefix: this.prefix,
  });
  private readonly queueEvents = new QueueEvents(NOTIFICATIONS_QUEUE_NAME, {
    connection: this.connection,
    prefix: this.prefix,
  });

  getQueue() {
    return this.queue;
  }

  getPrefix() {
    return this.prefix;
  }

  getQueueName() {
    return NOTIFICATIONS_QUEUE_NAME;
  }

  async addBulk(jobs: QueueJob[]) {
    if (jobs.length === 0) {
      return [];
    }

    return this.queue.addBulk(jobs);
  }

  async removeJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return false;
    }

    await job.remove();
    return true;
  }

  async obliterate() {
    await this.queue.obliterate({ force: true });
  }

  async onModuleDestroy() {
    await this.queueEvents.close();
    await this.queue.close();
  }
}
