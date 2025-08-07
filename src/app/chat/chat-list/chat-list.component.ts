// src/app/features/chat/components/chat-list/chat-list.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { CreateRoomDto, Room } from '../../core/models/room';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import {
  NewChatDialogComponent,
  NewChatDialogResult,
} from '../new-chat-dialog/new-chat-dialog.component';

@Component({
  selector: 'app-chat-list',
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatToolbarModule,
    MatDialogModule,
    NgScrollbarModule,

  ],
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
})
export class ChatListComponent {
  private authService = inject(AuthService);
  private chatService = inject(ChatService);

  private dialog = inject(MatDialog);

  @Input({ required: true }) rooms: Room[] = [];
  @Input() allUsers: User[] = []; // Liste complète des utilisateurs
  @Output() roomSelected = new EventEmitter<Room>();
  @Output() closeList = new EventEmitter<void>();

  showUserSelection = false;
  filteredUsers: User[] = [];

  getRoomAvatar(room: Room): string {
    if (room.isChatBot) {
      return 'assets/bot-avatar.png'; // Un avatar spécifique pour le bot
    }
    let avatar: string = 'assets/default-avatar.png';
    if (room.image) {
      avatar = room.image;
    } else if (room.users.length > 2) {
      avatar = 'assets/default-group-avatar.png';
    } else {
      avatar =
        room.users.find((u) => u._id !== this.authService.currentUser()?._id)
          ?.image || 'assets/default-avatar.png';
    }
    return avatar;
  }

  selectRoom(room: Room): void {
    this.roomSelected.emit(room);
  }

  close(): void {
    this.closeList.emit();
  }

  // Retourne un aperçu du dernier message de la room.
  // Si c'est une image/gif (média), renvoie { text: 'image', italic: true } pour affichage en italique.
  getLastMessagePreview(room: Room): { text: string; italic: boolean } {
    if (!room.lastMessage) {
      return { text: '', italic: false };
    }

    // Détection heuristique d'un média image/gif
    if (room.lastMessage.mediaUrl) {
      if (room.lastMessage.mediaUrl.endsWith('.gif')) {
        return { text: '[gif]', italic: true };
      }
      if (/\.(png|jpe?g|webp|bmp|svg)$/i.test(room.lastMessage.mediaUrl)) {
        return { text: '[image]', italic: true };
      }
    }

    return {
      text: room.lastMessage.content || '',
      italic: false,
    };
  }

  openNewChatDialog(): void {
    const dialogRef = this.dialog.open(NewChatDialogComponent, {
      width: '60vw',
      minWidth: '450px',
    });

    dialogRef.afterClosed().subscribe((newChatResult?: NewChatDialogResult) => {
      const currentUser = this.authService.currentUser();
      if (
        newChatResult &&
        newChatResult.userIds &&
        newChatResult.userIds.length > 0 &&
        currentUser &&
        currentUser._id
      ) {
        console.log('Users selected for new chat:', newChatResult.userIds);

        // Créer la DTO pour la nouvelle room 1-to-1
        const createRoomDto: CreateRoomDto = {
          name: newChatResult.name || 'Nouvelle conversation',
          image: newChatResult.image,
          userIds: [currentUser._id, ...newChatResult.userIds],
        };

        // Appeler le service socket pour créer la room
        this.chatService.createRoom(createRoomDto);

        // Optionnel: Fermer cette liste et attendre que le `ChatContainer`
        // reçoive l'événement 'roomCreated' pour ouvrir le nouveau panneau.
        this.close(); // Ferme la liste des conversations
      } else {
        console.log('New chat dialog closed without selection.');
      }
    });
  }
}
