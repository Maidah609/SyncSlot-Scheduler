import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { LocationType } from "@syncslot/database";
import { EventTypeQuestionDto } from "./event-type-question.dto";

export class CreateEventTypeDto {
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug must contain only lowercase letters, numbers, and hyphens.",
  })
  slug!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(64)
  color?: string | null;

  @IsEnum(LocationType)
  locationType!: LocationType;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(500)
  locationValue?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(4000)
  cancellationPolicy?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minNoticeMins!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxFutureDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferBeforeMins!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferAfterMins!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dailyLimit?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weeklyLimit?: number | null;

  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  scheduleId!: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EventTypeQuestionDto)
  bookingQuestions!: EventTypeQuestionDto[];
}
