import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { BookingQuestionType } from "@syncslot/database";

export class EventTypeQuestionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsEnum(BookingQuestionType)
  type!: BookingQuestionType;

  @IsBoolean()
  isRequired!: boolean;

  @ValidateIf(({ type }) => type === BookingQuestionType.SINGLE_SELECT || type === BookingQuestionType.MULTI_SELECT)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value)
    ? value.map((entry) => typeof entry === "string" ? entry.trim() : entry).filter(Boolean)
    : value)
  options?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  order!: number;
}
