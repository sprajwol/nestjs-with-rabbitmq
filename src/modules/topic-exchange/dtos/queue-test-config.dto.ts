import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class QueueTestConfigDto {
  @ApiProperty({ description: 'The number of messages to populate the topic-exchange queue with.', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  numberOfMessages!: number;
}