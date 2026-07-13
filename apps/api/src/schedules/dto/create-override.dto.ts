import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsOptional, Matches } from "class-validator";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateOverrideDto {
  @IsDateString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  date!: string;

  @IsBoolean()
  isClosed!: boolean;

  @IsOptional()
  @Matches(TIME_PATTERN, {
    message: "startTime must be in HH:MM 24-hour format.",
  })
  startTime?: string | null;

  @IsOptional()
  @Matches(TIME_PATTERN, {
    message: "endTime must be in HH:MM 24-hour format.",
  })
  endTime?: string | null;
}
