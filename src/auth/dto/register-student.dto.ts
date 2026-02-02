import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  Matches,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { AcademicYear } from '../../students/enums/year.enum';

export class RegisterStudentDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)',
    },
  )
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Major is required' })
  major: string;

  @IsEnum(AcademicYear)
  year: AcademicYear;

  @IsString()
  @IsOptional()
  graduationYear?: string;

  @IsBoolean()
  @IsOptional()
  agreedToTerms: boolean = true;
}
