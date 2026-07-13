import { Injectable, Logger } from "@nestjs/common";
import { getEnvConfig } from "@syncslot/config";
import { Resend } from "resend";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./notifications.types";

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly env = getEnvConfig();
  private readonly client = this.env.RESEND_API_KEY ? new Resend(this.env.RESEND_API_KEY) : null;

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.client) {
      if (this.env.NODE_ENV === "production") {
        throw new Error("RESEND_API_KEY is required to send email in production.");
      }

      this.logger.warn(`RESEND_API_KEY is not set. Mock-sending ${input.to} with subject "${input.subject}".`);
      return {
        providerMessageId: `mock-${Date.now()}`,
      };
    }

    const response = await this.client.emails.send({
      from: `${this.env.EMAIL_FROM_NAME} <${this.env.EMAIL_FROM_EMAIL}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      providerMessageId: response.data?.id ?? null,
    };
  }
}
