import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { StudentsService } from '../students/students.service';
import { BusinessesService } from '../businesses/businesses.service';
import { EmailService } from './email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CreateStudentDto } from '../students/dto/create-student.dto';
import { CreateBusinessDto } from '../businesses/dto/create-business.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private studentsService: StudentsService,
    private businessesService: BusinessesService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail?.(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: any) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errors: { email: ['User not found'] },
      });
    }
    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errors: { password: ['Incorrect password'] },
      });
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    let student = null;
    let business = null;
    if (user.role === UserRole.STUDENT || user.role === UserRole.FACULTY) {
      student = await this.studentsService.findByUserId(user.id);
    }
    if (user.role === UserRole.BUSINESS) {
      business = await this.businessesService.findByUserId(user.id);
    }
    return {
      data: {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        ...(student
          ? {
              student: {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                major: student.major,
              },
            }
          : {}),
        ...(business
          ? {
              business: {
                id: business.id,
                businessName: business.businessName,
                businessType: business.businessType,
                location: business.location,
              },
            }
          : {}),
      },
      message: 'Login successful',
    };
  }

  async registerStudent(dto: any) {
    // Check if user already exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        message: 'Email already registered',
        errors: { email: ['Email already exists'] },
      });
    }
    
    // Require EULA acceptance
    if (!dto.agreedToTerms || dto.agreedToTerms !== true) {
      throw new BadRequestException({
        message: 'You must accept the Terms of Service to register',
        errors: { agreedToTerms: ['Terms acceptance is required'] },
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    // Determine role: allow faculty to register via student flow
    const userRole =
      dto.role && dto.role.toLowerCase() === 'faculty'
        ? UserRole.FACULTY
        : UserRole.STUDENT;

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      role: userRole,
      agreedToTerms: dto.agreedToTerms,
    } as CreateUserDto);
    // Create student profile
    const student = await this.studentsService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      major: dto.major,
      year: dto.year,
      role: userRole,
      user: user,
    });
    
    // Note: EULA acceptance is tracked separately via moderation service
    // We'll accept it after user creation if needed via the moderation endpoint
    
    // Create JWT token for the new user
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);
    return {
      data: {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          major: student.major,
        },
      },
      message: 'Student registered successfully',
    };
  }

  async registerBusiness(dto: any) {
    // Check if user already exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        message: 'Email already registered',
        errors: { email: ['Email already exists'] },
      });
    }
    
    // Require EULA acceptance
    if (!dto.agreedToTerms || dto.agreedToTerms !== true) {
      throw new BadRequestException({
        message: 'You must accept the Terms of Service to register',
        errors: { agreedToTerms: ['Terms acceptance is required'] },
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      role: UserRole.BUSINESS,
      agreedToTerms: dto.agreedToTerms,
    } as CreateUserDto);
    // Create business profile
    const business = await this.businessesService.create({
      businessName: dto.businessName,
      email: dto.email,
      businessType: dto.businessType,
      location: dto.location,
      user: user,
    } as CreateBusinessDto);
    
    // Note: EULA acceptance is tracked separately via moderation service
    // We'll accept it after user creation if needed via the moderation endpoint
    
    // Create JWT token for the new user
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);
    return {
      data: {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        business: {
          id: business.id,
          businessName: business.businessName,
          businessType: business.businessType,
          location: business.location,
        },
      },
      message: 'Business registered successfully',
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    // Get user to determine role
    const user = await this.usersService.findOne(userId);
    if (!user) {
      return; // User doesn't exist, nothing to delete
    }

    // Delete related student or business record first to avoid foreign key constraint
    if (user.role === UserRole.STUDENT) {
      try {
        const student = await this.studentsService.findByUserId(userId);
        if (student) {
          await this.studentsService.remove(student.id);
        }
      } catch (error) {
        // Student might not exist, continue with user deletion
      }
    } else if (user.role === UserRole.BUSINESS) {
      try {
        const business = await this.businessesService.findByUserId(userId);
        if (business) {
          await this.businessesService.remove(business.id);
        }
      } catch (error) {
        // Business might not exist, continue with user deletion
      }
    }

    // Now delete the user
    await this.usersService.remove(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    // Don't reveal if user exists for security
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

    // Save reset token to user
    await this.usersService.updatePasswordResetToken(
      user.id,
      resetToken,
      resetExpires,
    );

    // Send email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      console.log(`Password reset email sent successfully to ${user.email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // Log detailed error for debugging
      if (error.response) {
        console.error('SendGrid API Error:', JSON.stringify(error.response.body, null, 2));
      }
      // If email fails, clear the reset token
      await this.usersService.updatePasswordResetToken(user.id, null, null);
      throw new BadRequestException('Failed to send reset email. Please try again later.');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException({
        message: 'Invalid or expired reset token',
        errors: { token: ['Reset token is invalid or has expired'] },
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await this.usersService.updatePassword(user.id, hashedPassword);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errors: { userId: ['User does not exist'] },
      });
    }

    // Get user with password
    const userWithPassword = await this.usersService.findByEmail(user.email);
    if (!userWithPassword) {
      throw new NotFoundException({
        message: 'User not found',
        errors: { userId: ['User does not exist'] },
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      userWithPassword.password,
    );
    if (!isMatch) {
      throw new UnauthorizedException({
        message: 'Invalid current password',
        errors: { currentPassword: ['Current password is incorrect'] },
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.usersService.updatePassword(userId, hashedPassword);
  }

  async updateEmail(userId: string, newEmail: string): Promise<void> {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errors: { userId: ['User does not exist'] },
      });
    }

    // Check if email is already taken by another user
    const existingUser = await this.usersService.findByEmail(newEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException({
        message: 'Email already registered',
        errors: { email: ['Email already exists'] },
      });
    }

    // Check if email is the same
    if (user.email === newEmail) {
      throw new BadRequestException({
        message: 'New email is the same as current email',
        errors: { email: ['New email must be different from current email'] },
      });
    }

    // Update email
    await this.usersService.update(userId, { email: newEmail });
  }
}
