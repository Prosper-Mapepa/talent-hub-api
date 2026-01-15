import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Follow } from './entities/follow.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
  ) {}

  async onModuleInit() {
    // Ensure password reset columns exist on app startup
    try {
      await this.ensurePasswordResetColumns();
    } catch (error) {
      console.error('⚠️  Could not ensure password reset columns on startup:', error);
      // Don't throw - app can still start, columns will be added on first use
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.resetPasswordToken = :token', { token })
      .andWhere('user.resetPasswordExpires > :now', { now: new Date() })
      .getOne();
  }

  async updatePasswordResetToken(
    userId: string,
    token: string | null,
    expires: Date | null,
  ): Promise<void> {
    try {
      // Use raw SQL to ensure it works even if TypeORM metadata is out of sync
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({
          resetPasswordToken: token,
          resetPasswordExpires: expires,
        } as any)
        .where('id = :id', { id: userId })
        .execute();
    } catch (error: any) {
      // If columns don't exist, try to add them and retry
      if (error.message?.includes('resetPasswordToken') || error.message?.includes('reset_password_token')) {
        console.error('⚠️  Password reset columns missing. Attempting to add them...');
        await this.ensurePasswordResetColumns();
        // Retry after adding columns
        await this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({
            resetPasswordToken: token,
            resetPasswordExpires: expires,
          } as any)
          .where('id = :id', { id: userId })
          .execute();
      } else {
        throw error;
      }
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        } as any)
        .where('id = :id', { id: userId })
        .execute();
    } catch (error: any) {
      // If columns don't exist, try to add them and retry
      if (error.message?.includes('resetPasswordToken') || error.message?.includes('reset_password_token')) {
        console.error('⚠️  Password reset columns missing. Attempting to add them...');
        await this.ensurePasswordResetColumns();
        // Retry after adding columns
        await this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
          } as any)
          .where('id = :id', { id: userId })
          .execute();
      } else {
        throw error;
      }
    }
  }

  private async ensurePasswordResetColumns(): Promise<void> {
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'reset_password_token'
          ) THEN
            ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) NULL;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'reset_password_expires'
          ) THEN
            ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP NULL;
          END IF;
        END $$;
      `);
      console.log('✅ Password reset columns ensured!');
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  // Follow/Unfollow Methods
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const follower = await this.findOne(followerId);
    if (!follower) {
      throw new NotFoundException('Follower user not found');
    }

    const following = await this.findOne(followingId);
    if (!following) {
      throw new NotFoundException('User to follow not found');
    }

    // Check if already following
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      return existingFollow;
    }

    const follow = this.followRepository.create({
      followerId,
      followingId,
    });

    return this.followRepository.save(follow);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (follow) {
      await this.followRepository.remove(follow);
    }
  }

  async getFollowers(userId: string): Promise<User[]> {
    const follows = await this.followRepository.find({
      where: { followingId: userId },
      relations: ['follower'],
    });

    return follows.map((follow) => follow.follower);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const follows = await this.followRepository.find({
      where: { followerId: userId },
      relations: ['following'],
    });

    return follows.map((follow) => follow.following);
  }

  async checkFollowStatus(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    return !!follow;
  }
}
