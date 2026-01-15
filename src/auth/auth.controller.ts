import {
  Controller,
  Post,
  Delete,
  Patch,
  Body,
  UsePipes,
  ValidationPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Response } from 'express';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password to receive JWT token',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials',
    examples: {
      student: {
        summary: 'Student Login',
        value: {
          email: 'student@example.com',
          password: 'SecurePass123!',
        },
      },
      business: {
        summary: 'Business Login',
        value: {
          email: 'business@example.com',
          password: 'SecurePass123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'uuid',
            email: 'user@example.com',
            role: 'student',
            status: 'active',
          },
        },
        message: 'Login successful',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid credentials or validation error',
    schema: {
      example: {
        success: false,
        message: 'Invalid email or password',
        errors: {
          email: ['Email must be a valid email address'],
          password: ['Password must be at least 8 characters long'],
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication failed',
    schema: {
      example: {
        success: false,
        message: 'Invalid credentials',
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(loginDto);
    res.locals.message = 'Login successful';
    return res.json(result);
  }

  @Post('register-student')
  @Public()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Register new student',
    description: 'Create a new student account with profile information',
  })
  @ApiBody({
    type: RegisterStudentDto,
    description: 'Student registration data',
    examples: {
      computerScience: {
        summary: 'Computer Science Student',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@university.edu',
          password: 'SecurePass123!',
          major: 'COMPUTER_SCIENCE',
          year: 'SENIOR',
          agreedToTerms: true,
        },
      },
      business: {
        summary: 'Business Student',
        value: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@university.edu',
          password: 'SecurePass123!',
          major: 'BUSINESS_ADMINISTRATION',
          year: 'JUNIOR',
          agreedToTerms: true,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Student registered successfully',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: 'uuid',
            email: 'john.doe@university.edu',
            role: 'student',
            status: 'active',
          },
          student: {
            id: 'uuid',
            firstName: 'John',
            lastName: 'Doe',
            major: 'COMPUTER_SCIENCE',
            year: 'SENIOR',
          },
        },
        message: 'Student registered successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or invalid data',
    schema: {
      example: {
        success: false,
        message: 'Validation failed',
        errors: {
          email: ['Email must be a valid email address'],
          password: ['Password must be at least 8 characters long'],
          major: ['Major must be a valid enum value'],
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email already exists',
    schema: {
      example: {
        success: false,
        message: 'Email already registered',
      },
    },
  })
  async registerStudent(@Body() dto: RegisterStudentDto, @Res() res: Response) {
    const result = await this.authService.registerStudent(dto);
    res.locals.message = 'Student registered successfully';
    return res.json(result);
  }

  @Post('register-business')
  @Public()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Register new business',
    description: 'Create a new business account with company information',
  })
  @ApiBody({
    type: RegisterBusinessDto,
    description: 'Business registration data',
    examples: {
      techCompany: {
        summary: 'Technology Company',
        value: {
          businessName: 'TechCorp Solutions',
          email: 'contact@techcorp.com',
          password: 'SecurePass123!',
          businessType: 'TECHNOLOGY',
          location: 'San Francisco, CA',
          agreedToTerms: true,
        },
      },
      consulting: {
        summary: 'Consulting Firm',
        value: {
          businessName: 'Global Consulting Group',
          email: 'info@globalconsulting.com',
          password: 'SecurePass123!',
          businessType: 'CONSULTING',
          location: 'New York, NY',
          agreedToTerms: true,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Business registered successfully',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: 'uuid',
            email: 'contact@techcorp.com',
            role: 'business',
            status: 'active',
          },
          business: {
            id: 'uuid',
            businessName: 'TechCorp Solutions',
            businessType: 'TECHNOLOGY',
            location: 'San Francisco, CA',
          },
        },
        message: 'Business registered successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or invalid data',
    schema: {
      example: {
        success: false,
        message: 'Validation failed',
        errors: {
          email: ['Email must be a valid email address'],
          password: ['Password must be at least 8 characters long'],
          businessType: ['Business type must be a valid enum value'],
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email already exists',
    schema: {
      example: {
        success: false,
        message: 'Email already registered',
      },
    },
  })
  async registerBusiness(
    @Body() dto: RegisterBusinessDto,
    @Res() res: Response,
  ) {
    const result = await this.authService.registerBusiness(dto);
    res.locals.message = 'Business registered successfully';
    return res.json(result);
  }

  @Post('forgot-password')
  @Public()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send a password reset email to the user',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'If the email exists, a reset link has been sent',
    schema: {
      example: {
        success: true,
        message:
          'If an account with this email exists, a password reset link has been sent',
      },
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Res() res: Response) {
    await this.authService.forgotPassword(dto.email);
    res.locals.message =
      'If an account with this email exists, a password reset link has been sent';
    return res.json({
      data: null,
      message:
        'If an account with this email exists, a password reset link has been sent',
    });
  }

  @Post('reset-password')
  @Public()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset password using the token from the email',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    description: 'Password reset successfully',
    schema: {
      example: {
        success: true,
        message: 'Password reset successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token',
    schema: {
      example: {
        success: false,
        message: 'Invalid or expired reset token',
      },
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto, @Res() res: Response) {
    await this.authService.resetPassword(dto.token, dto.password);
    res.locals.message = 'Password reset successfully';
    return res.json({ data: null, message: 'Password reset successfully' });
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Change password',
    description: 'Change password for authenticated user',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Password changed successfully',
    schema: {
      example: {
        success: true,
        message: 'Password changed successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid current password or authentication required',
    schema: {
      example: {
        success: false,
        message: 'Invalid current password',
      },
    },
  })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
    @Res() res: Response,
  ) {
    await this.authService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    res.locals.message = 'Password changed successfully';
    return res.json({ data: null, message: 'Password changed successfully' });
  }

  @Patch('update-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Update email',
    description: 'Update email address for authenticated user',
  })
  @ApiBody({ type: UpdateEmailDto })
  @ApiOkResponse({
    description: 'Email updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Email updated successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or email already exists',
    schema: {
      example: {
        success: false,
        message: 'Email already registered',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    schema: {
      example: {
        success: false,
        message: 'Unauthorized - Authentication required',
      },
    },
  })
  async updateEmail(
    @CurrentUser() user: any,
    @Body() dto: UpdateEmailDto,
    @Res() res: Response,
  ) {
    await this.authService.updateEmail(user.userId, dto.email);
    res.locals.message = 'Email updated successfully';
    return res.json({ data: null, message: 'Email updated successfully' });
  }

  @Delete('delete-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete own account',
    description: "Permanently delete the authenticated user's account",
  })
  @ApiNoContentResponse({
    description: 'Account deleted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    schema: {
      example: {
        success: false,
        message: 'Unauthorized - Authentication required',
      },
    },
  })
  async deleteAccount(@CurrentUser() user: any, @Res() res: Response) {
    await this.authService.deleteAccount(user.userId);
    res.locals.message = 'Account deleted successfully';
    return res.json({ data: null });
  }
}
