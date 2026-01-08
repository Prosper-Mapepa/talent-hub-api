import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, SelectQueryBuilder } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { User } from '../users/entities/user.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async findAllForUser(userId: string): Promise<Conversation[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.student', 'student')
      .leftJoinAndSelect('participants.business', 'business')
      .innerJoin('conversation_participants', 'cp', 'cp.conversation_id = conversation.id')
      .where('cp.user_id = :userId', { userId })
      .orderBy('conversation.updatedAt', 'DESC')
      .getMany();

    // Load last message for each conversation
    for (const conversation of conversations) {
      const messages = await this.messageRepository.find({
        where: { conversationId: conversation.id },
        order: { createdAt: 'DESC' },
        take: 1,
      });
      if (messages.length > 0) {
        (conversation as any).lastMessage = messages[0];
      }
    }

    return conversations;
  }

  async create(participantIds: string[]): Promise<Conversation> {
    // Validate participantIds
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      throw new NotFoundException('Participant IDs are required');
    }
    
    // Filter out any undefined, null, or invalid values
    const validParticipantIds = participantIds.filter(
      id => id && typeof id === 'string' && id.trim() !== '' && id !== 'undefined'
    );
    
    if (validParticipantIds.length !== participantIds.length) {
      throw new NotFoundException('Invalid participant IDs provided');
    }
    
    if (validParticipantIds.length < 2) {
      throw new NotFoundException('At least 2 participants are required');
    }
    
    const users = await this.userRepository.find({
      where: { id: In(validParticipantIds) },
      relations: ['student', 'business'],
    });
    
    if (users.length !== validParticipantIds.length) {
      throw new NotFoundException(`One or more users not found. Expected ${validParticipantIds.length}, found ${users.length}`);
    }
    
    // Check if a conversation already exists between these participants
    // For 2 participants, find conversations that have exactly these 2 participants
    if (validParticipantIds.length === 2) {
      const existingConversations = await this.conversationRepository
        .createQueryBuilder('conversation')
        .innerJoin('conversation.participants', 'participant')
        .where('participant.id IN (:...ids)', { ids: validParticipantIds })
        .groupBy('conversation.id')
        .having('COUNT(DISTINCT participant.id) = :count', { count: validParticipantIds.length })
        .getMany();
      
      // Check if any of these conversations has exactly these 2 participants (no more, no less)
      for (const existingConv of existingConversations) {
        const convWithParticipants = await this.conversationRepository.findOne({
          where: { id: existingConv.id },
          relations: ['participants'],
        });
        
        if (convWithParticipants && convWithParticipants.participants.length === validParticipantIds.length) {
          const convParticipantIds = convWithParticipants.participants.map(p => p.id).sort();
          const requestedIds = [...validParticipantIds].sort();
          
          if (convParticipantIds.length === requestedIds.length &&
              convParticipantIds.every((id, index) => id === requestedIds[index])) {
            // Found existing conversation with exact same participants
            // Return it with full relations
            const found = await this.conversationRepository.findOne({
              where: { id: existingConv.id },
              relations: ['participants', 'participants.student', 'participants.business'],
            });
            if (!found) throw new NotFoundException('Conversation not found');
            return found;
          }
        }
      }
    }
    
    // No existing conversation found, create a new one
    const conversation = this.conversationRepository.create();
    const saved = await this.conversationRepository.save(conversation);
    
    // Add participants to the conversation
    saved.participants = users;
    const savedWithParticipants = await this.conversationRepository.save(saved);
    
    // Fetch with participants and their relations
    const found = await this.conversationRepository.findOne({
      where: { id: savedWithParticipants.id },
      relations: ['participants', 'participants.student', 'participants.business'],
    });
    if (!found) throw new NotFoundException('Conversation not found after creation');
    return found;
  }

  async findOne(id: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['participants', 'participants.student', 'participants.business'],
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async remove(id: string): Promise<void> {
    await this.conversationRepository.delete(id);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { conversationId: conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    // Validate inputs
    if (!conversationId || conversationId === 'undefined' || !conversationId.trim()) {
      throw new NotFoundException('Conversation ID is required');
    }
    if (!senderId || senderId === 'undefined' || !senderId.trim()) {
      throw new NotFoundException('Sender ID is required');
    }
    if (!content || !content.trim()) {
      throw new NotFoundException('Message content is required');
    }
    
    const conversation = await this.conversationRepository.findOne({ 
      where: { id: conversationId },
      relations: ['participants']
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    
    // Verify sender is a participant
    const senderIsParticipant = conversation.participants.some(p => p.id === senderId);
    if (!senderIsParticipant) {
      throw new NotFoundException('Sender is not a participant in this conversation');
    }
    
    // Find the other participant to set as receiverId
    const otherParticipant = conversation.participants.find(p => p.id !== senderId);
    
    if (!otherParticipant || !otherParticipant.id) {
      throw new NotFoundException('No recipient found for this conversation');
    }
    
    const message = this.messageRepository.create({
      conversationId: conversationId,
      senderId,
      content: content.trim(),
      receiverId: otherParticipant.id,
    });
    return this.messageRepository.save(message);
  }
} 