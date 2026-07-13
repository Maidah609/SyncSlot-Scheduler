import cookieParser = require("cookie-parser");
import { Request, Response } from "express";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { loadEnvConfig } from "@syncslot/config";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

type RequestWithId = Request & { id?: string };

async function bootstrap() {
  const env = loadEnvConfig();
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.use((request: RequestWithId, response: Response, next: () => void) => {
    if (request.id) {
      response.setHeader("x-request-id", request.id);
    }

    next();
  });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix("api");

  if (env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("SyncSlot API")
      .setDescription("SyncSlot backend API")
      .setVersion("1.0.0")
      .addServer("/api")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  await app.listen(env.PORT);
}

bootstrap();
