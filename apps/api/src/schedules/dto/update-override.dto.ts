import { IsBoolean, IsDateString, IsOptional, Matches } from "class-validator";
import { Transform } from "class-transformer";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateOverrideDto {
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  date?: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

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
