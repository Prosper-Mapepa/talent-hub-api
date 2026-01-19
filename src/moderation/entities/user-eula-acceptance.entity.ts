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
import { EulaVersion } from './eula-version.entity';

@Entity('user_eula_acceptances')
@Unique(['userId', 'eulaVersionId'])
export class UserEulaAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'eula_version_id', type: 'uuid' })
  eulaVersionId: string;

  @ManyToOne(() => EulaVersion)
  @JoinColumn({ name: 'eula_version_id' })
  eulaVersion: EulaVersion;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'accepted_at' })
  acceptedAt: Date;
}
