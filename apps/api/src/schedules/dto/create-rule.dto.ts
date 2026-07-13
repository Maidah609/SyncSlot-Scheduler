import { Matches, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateRuleDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dayOfWeek!: number;

  @Matches(TIME_PATTERN, {
    message: "startTime must be in HH:MM 24-hour format.",
  })
  startTime!: string;

  @Matches(TIME_PATTERN, {
    message: "endTime must be in HH:MM 24-hour format.",
  })
  endTime!: string;
}
