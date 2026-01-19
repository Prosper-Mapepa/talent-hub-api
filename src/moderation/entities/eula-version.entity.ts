import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('eula_versions')
export class EulaVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  version: number;

  @Column({ type: 'text' })
  content: string; // Full EULA text

  @Column({ default: true })
  active: boolean; // Only one active version at a time

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
