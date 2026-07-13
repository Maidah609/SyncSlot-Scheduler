import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateBookingNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
