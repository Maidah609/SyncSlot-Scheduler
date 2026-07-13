import { IsEmail, IsISO8601, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePublicBookingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  inviteeName!: string;

  @IsEmail()
  inviteeEmail!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  inviteeTimezone!: string;

  @IsISO8601()
  startTime!: string;

  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
