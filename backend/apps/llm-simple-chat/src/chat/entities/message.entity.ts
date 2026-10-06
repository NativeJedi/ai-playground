import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CHAT_ROLES, type ChatRole } from '../chat.dto.js';

@Entity('messages')
@Index(['userId', 'conversationId'])
export class Message {
  // Auto-increment id doubles as a stable sort key for the history. IT is not a production approach
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'conversation_id', type: 'varchar' })
  conversationId: string;

  @Column({ type: 'enum', enum: CHAT_ROLES })
  role: ChatRole;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
