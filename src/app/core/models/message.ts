import { User } from './user';

export interface Message {
  _id: string;
  room: string; // ID de la room
  sender: User;
  content: string;
  createdAt: Date;
}

export interface ProcessedMessage extends Message {
  showAvatarAndName: boolean;
  showTimestamp: boolean;
  isGroupStart: boolean;
  isGroupEnd: boolean;
}

export interface SendMessageDto {
  room: string;
  sender: User;
  content: string;
}
