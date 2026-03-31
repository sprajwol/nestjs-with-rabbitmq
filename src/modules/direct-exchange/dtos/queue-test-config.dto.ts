import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class QueueTestConfigDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsPositive()
  @IsNumber()
  numberOfMessages: number;
}