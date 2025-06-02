import { User } from './user';

export interface MessageReaction {
  emoji: string;
  userIds: string[]; // IDs des utilisateurs ayant réagi avec cet emoji
}

export interface Message {
  _id: string;
  room: string; // ID de la room
  sender: User;
  content: string;
  reactions: MessageReaction[];
  createdAt: Date;
}

export interface ProcessedMessage extends Message {
  showAvatarAndName: boolean;
  showTimestamp: boolean;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  showDateSeparator: boolean;
}

export interface SendMessageDto {
  room: string;
  sender: User;
  content: string;
}

export interface MessageReactionDto {
  messageId: string;
  emoji: string;
}
