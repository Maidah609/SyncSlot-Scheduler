import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, IsTimeZone, MaxLength, MinLength } from "class-validator";

export class CreateScheduleDto {
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsTimeZone()
  timezone!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
