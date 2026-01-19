import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReportType {
  MESSAGE = 'MESSAGE',
  PROFILE = 'PROFILE',
  PROJECT = 'PROJECT',
  ACHIEVEMENT = 'ACHIEVEMENT',
  JOB = 'JOB',
  USER = 'USER',
}

export enum ReportReason {
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  HARASSMENT = 'HARASSMENT',
  SPAM = 'SPAM',
  FAKE_PROFILE = 'FAKE_PROFILE',
  INAPPROPRIATE_BEHAVIOR = 'INAPPROPRIATE_BEHAVIOR',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

@Entity('content_reports')
export class ContentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id' })
  reporterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'reported_user_id', nullable: true })
  reportedUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reported_user_id' })
  reportedUser: User | null;

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ name: 'content_id', nullable: true })
  contentId: string | null; // ID of the specific content (message, project, etc.)

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  description: string | null; // Additional details from reporter

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'action_taken', type: 'text', nullable: true })
  actionTaken: string | null; // What action was taken (e.g., "Content removed", "User suspended")

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
