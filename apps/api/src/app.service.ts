import { Injectable } from "@nestjs/common";
import { PrismaService } from "@syncslot/database";

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHealth() {
    const databaseOk = await this.prismaService.checkConnection();

    return {
      ok: databaseOk,
      service: "syncslot-api",
      database: {
        status: databaseOk ? "up" : "down",
      },
    };
  }
}
