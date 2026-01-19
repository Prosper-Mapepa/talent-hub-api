import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('blocked_users')
@Unique(['blockerId', 'blockedUserId'])
export class BlockedUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blocker_id', type: 'uuid' })
  blockerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @Column({ name: 'blocked_user_id', type: 'uuid' })
  blockedUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocked_user_id' })
  blockedUser: User;

  @Column({ name: 'developer_notified', default: false })
  developerNotified: boolean; // Track if developer has been notified

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
