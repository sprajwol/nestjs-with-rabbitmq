import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class QueuePayloadDto {
  @IsNotEmpty()
  @IsNumberString()
  id: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
