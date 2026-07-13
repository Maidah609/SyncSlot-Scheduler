import { IsOptional, IsString, MaxLength } from "class-validator";

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
