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

export interface MessageSegment {
  type: 'text' | 'emoji';
  content: string;
}

export interface ProcessedReaction extends MessageReaction {
  tooltip: string;
}

export interface ProcessedMessage extends Message {
  showAvatarAndName: boolean;
  showTimestamp: boolean;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  showDateSeparator: boolean;
  isBotMessage?: boolean; // Ajout du flag pour les messages du bot
  parsedContent?: MessageSegment[]; // Contenu du message avec les emojis et le texte séparés
  parsedReactions?: ProcessedReaction[]; // Réactions avec des tooltips
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
