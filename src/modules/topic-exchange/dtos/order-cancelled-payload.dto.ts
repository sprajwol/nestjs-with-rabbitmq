import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class OrderCancelledPayloadDto {
  @IsNotEmpty()
  @IsNumberString()
  id!: string;

  @IsNotEmpty()
  @IsString()
  type!: string;

  @IsNotEmpty()
  @IsString()
  content!: string;
}
