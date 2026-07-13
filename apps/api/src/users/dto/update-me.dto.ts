import { Transform } from "class-transformer";
import { IsOptional, IsString, IsTimeZone, Matches, MaxLength, MinLength } from "class-validator";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from "../users.constants";

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @MinLength(USERNAME_MIN_LENGTH)
  @MaxLength(USERNAME_MAX_LENGTH)
  @Matches(USERNAME_PATTERN, {
    message: "username must contain only lowercase letters, numbers, and hyphens.",
  })
  username?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsTimeZone()
  timezone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @MaxLength(2000)
  welcome?: string;
}
