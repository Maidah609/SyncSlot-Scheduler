import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class RescheduleBookingDto {
  @IsISO8601()
  startTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
