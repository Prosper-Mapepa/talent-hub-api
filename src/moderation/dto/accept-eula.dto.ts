import { IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptEulaDto {
  @ApiProperty({
    description: 'EULA version number',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  version: number;

  @ApiProperty({
    description: 'User confirms acceptance of terms',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  accepted: boolean;
}
