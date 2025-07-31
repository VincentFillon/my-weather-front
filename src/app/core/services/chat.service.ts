// src/app/core/services/chat-socket.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message, MessageReactionDto, SendMessageDto } from '../models/message';
import {
  CreateRoomDto,
  JoinRoomDto,
  Room,
  UpdateRoomDto,
} from '../models/room';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private socketService = inject(SocketService);
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/chat`;

  private roomCreatedObserver$?: Observable<Room>;
  private messageSentObserver$?: Observable<Message>;
  private messageUpdatedObserver$?: Observable<Message>;
  private newMessageNotificationObserver$?: Observable<{
    roomId: string;
    message: Message;
  }>;
  private removedFromRoomObserver$?: Observable<{ roomId: string }>;
  private roomUpdatedObserver$?: Observable<Room>;
  private roomDeletedObserver$?: Observable<{ roomId: string }>;
  private roomListObserver$?: Observable<Room[]>;
  private messageListObserver$?: Observable<Message[]>;

  // --- Événements émis VERS le serveur ---

  createRoom(roomData: CreateRoomDto): void {
    this.socketService.emit('createRoom', roomData);
  }

  joinRoom(joinData: JoinRoomDto): void {
    this.socketService.emit('joinRoom', joinData);
  }

  leaveRoom(roomId: string): void {
    // Le backend attend juste l'ID de la room, l'ID user vient du token
    this.socketService.emit('leaveRoom', roomId);
  }

  removeUser(removeData: JoinRoomDto): void {
    this.socketService.emit('removeUser', removeData);
  }

  updateRoom(updateData: UpdateRoomDto): void {
    this.socketService.emit('updateRoom', updateData);
  }

  deleteRoom(roomId: string): void {
    this.socketService.emit('deleteRoom', roomId);
  }

  subscribeToRoomUpdates(roomId: string): void {
    this.socketService.emit('subscribeToRoom', { roomId });
  }

  unsubscribeFromRoomUpdates(roomId: string): void {
    this.socketService.emit('unsubscribeFromRoom', { roomId });
  }

  sendMessage(messageData: SendMessageDto): void {
    this.socketService.emit('sendMessage', messageData);
  }

  addReaction(messageReactionData: MessageReactionDto): void {
    this.socketService.emit('addReaction', messageReactionData);
  }
  removeReaction(messageReactionData: MessageReactionDto): void {
    this.socketService.emit('removeReaction', messageReactionData);
  }

  // --- Événements reçus DEPUIS le serveur ---

  onRoomCreated(): Observable<Room> {
    if (!this.roomCreatedObserver$) {
      this.roomCreatedObserver$ =
        this.socketService.fromEvent<Room>('roomCreated');
    }
    return this.roomCreatedObserver$;
  }

  onMessageSent(): Observable<Message> {
    if (!this.messageSentObserver$) {
      this.messageSentObserver$ =
        this.socketService.fromEvent<Message>('messageSent');
    }
    return this.messageSentObserver$;
  }

  onNewMessageNotification(): Observable<{ roomId: string; message: Message }> {
    if (!this.newMessageNotificationObserver$) {
      this.newMessageNotificationObserver$ = this.socketService.fromEvent<{
        roomId: string;
        message: Message;
      }>('newMessageNotification');
    }
    return this.newMessageNotificationObserver$;
  }

  onMessageUpdated(): Observable<Message> {
    if (!this.messageUpdatedObserver$) {
      this.messageUpdatedObserver$ =
        this.socketService.fromEvent<Message>('messageUpdated');
    }
    return this.messageUpdatedObserver$;
  }

  onRoomUpdated(): Observable<Room> {
    if (!this.roomUpdatedObserver$) {
      this.roomUpdatedObserver$ =
        this.socketService.fromEvent<Room>('roomUpdated');
    }
    return this.roomUpdatedObserver$;
  }

  onRemovedFromRoom(): Observable<{ roomId: string }> {
    if (!this.removedFromRoomObserver$) {
      this.removedFromRoomObserver$ = this.socketService.fromEvent<{
        roomId: string;
      }>('removedFromRoom');
    }
    return this.removedFromRoomObserver$;
  }

  onRoomDeleted(): Observable<{ roomId: string }> {
    // Renvoie l'ID de la room supprimée
    if (!this.roomDeletedObserver$) {
      this.roomDeletedObserver$ = this.socketService.fromEvent<{
        roomId: string;
      }>('roomDeleted');
    }
    return this.roomDeletedObserver$;
  }

  // --- Méthodes utilitaires ---

  // Récupérer toutes les rooms de l'utilisateur actuel
  getMyRooms(): Observable<Room[]> {
    if (!this.roomListObserver$) {
      this.roomListObserver$ =
        this.socketService.fromEvent<Room[]>('myRoomsList');
    }
    this.socketService.emit('getMyRooms', {}); // Émettre la demande
    return this.roomListObserver$;
  }

  // Récupérer les messages d'une room spécifique
  getMessagesForRoom(roomId: string): Observable<Message[]> {
    if (!this.messageListObserver$) {
      this.messageListObserver$ =
        this.socketService.fromEvent<Message[]>('messagesList');
    }
    this.socketService.emit('getMessages', { roomId }); // Émettre la demande
    return this.messageListObserver$;
  }

  getPaginatedMessages(
    roomId: string,
    limit: number = 30,
    before?: Date
  ): Observable<Message[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (before) {
      // Envoyer en ISO string
      params = params.set('before', before.toISOString());
    }
    return this.http.get<Message[]>(`${this.apiUrl}/rooms/${roomId}/messages`, {
      params,
    });
  }

  markRoomAsRead(roomId: string, lastMessageTimestamp?: Date): void {
    const payload: { roomId: string; lastMessageTimestamp?: string } = {
      roomId,
    };
    if (lastMessageTimestamp) {
      payload.lastMessageTimestamp = lastMessageTimestamp.toISOString();
    }
    this.socketService.emit('markAsRead', payload);
  }
}
