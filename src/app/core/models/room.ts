import { Message } from './message';
import { User } from './user';

export interface Room {
  _id: string;
  name: string;
  image?: string;
  users: User[];
  creator: User; // Ajout du créateur de la room
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastMessage?: Message; // Dernier message envoyé dans la room (pour affichage dans la liste des rooms)
  unreadCount?: number; // Nombre de messages non lus dans la room (pour affichage dans la liste des rooms)
}

export interface CreateRoomDto {
  name: string;
  image?: string;
  userIds: string[];
}

export interface JoinRoomDto {
  roomId: string;
  userId: string;
}

export interface UpdateRoomDto {
  roomId: string;
  name?: string;
  image?: string;
  userIds: string[];
}
