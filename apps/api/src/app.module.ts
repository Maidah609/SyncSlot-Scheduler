import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { loadEnvConfig } from "@syncslot/config";
import { DatabaseModule } from "@syncslot/database";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BookingsModule } from "./bookings/bookings.module";
import { EventTypesModule } from "./event-types/event-types.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { UsersModule } from "./users/users.module";

const env = loadEnvConfig();

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    BookingsModule,
    EventTypesModule,
    NotificationsModule,
    SchedulesModule,
    UsersModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.NODE_ENV === "production" ? "info" : "debug",
        genReqId: (request) => {
          const header = request.headers["x-request-id"];
          const requestId = Array.isArray(header) ? header[0] : header;

          return requestId?.trim() || randomUUID();
        },
        customProps: (request) => ({
          requestId: request.id,
        }),
        serializers: {
          req: (request) => ({
            id: request.id,
            method: request.method,
            url: request.url,
          }),
          res: (response) => ({
            statusCode: response.statusCode,
          }),
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
