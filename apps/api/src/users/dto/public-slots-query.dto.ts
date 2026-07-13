import { IsString, Matches, MaxLength } from "class-validator";

export class PublicSlotsQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @MaxLength(120)
  tz!: string;
}
