import { MessageType } from './message-type.enum'; // Import de MessageType
import { User } from './user';

export interface MessageReaction {
  emoji: string;
  userIds: string[]; // IDs des utilisateurs ayant réagi avec cet emoji
}

export interface Message {
  _id: string;
  room: string; // ID de la room
  sender: User | null;
  content: string;
  mediaUrl?: string;
  type?: MessageType; // Ajout du type de message
  reactions: MessageReaction[];
  createdAt: Date;
}

export interface ProcessedMessage extends Message {
  showAvatarAndName: boolean;
  showTimestamp: boolean;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  showDateSeparator: boolean;
  isBotMessage?: boolean; // Ajout du flag pour les messages du bot
}

export interface SendMessageDto {
  room: string;
  sender: User;
  content: string;
  mediaUrl?: string;
  type?: MessageType; // Ajout du type de message
}

export interface MessageReactionDto {
  messageId: string;
  emoji: string;
}
