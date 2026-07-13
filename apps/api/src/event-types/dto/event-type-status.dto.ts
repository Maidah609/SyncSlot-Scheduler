import { IsBoolean } from "class-validator";

export class EventTypeStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
