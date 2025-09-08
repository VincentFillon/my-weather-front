// src/app/features/chat/components/chat-container/chat-container.component.ts

import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Subscription } from 'rxjs';

import { MatSnackBar } from '@angular/material/snack-bar';
import { Message } from '../../core/models/message';
import { Room } from '../../core/models/room';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { NotificationService } from '../../core/services/notification.service';
import { ChatListComponent } from '../chat-list/chat-list.component'; // Créer ce composant
import { ChatPanelComponent } from '../chat-panel/chat-panel.component'; // Créer ce composant

interface ActiveChat {
  room: Room;
  isOpen: boolean;
  unreadCount: number;
}

@Component({
  selector: 'app-chat-container',
  imports: [
    MatListModule,
    MatBadgeModule,
    MatIconModule,
    MatButtonModule,
    ChatPanelComponent,
    ChatListComponent
],
  templateUrl: './chat-container.component.html',
  styleUrls: ['./chat-container.component.scss'],
})
export class ChatContainerComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  currentUser: User | null = null; // Ou type User si toujours défini quand ce composant est actif
  showChatList = false;
  rooms: Room[] = []; // Liste initiale des rooms
  activeChats: ActiveChat[] = []; // Panneaux actuellement ouverts ou minimisés
  maxOpenPanels = 3; // Limite de panneaux ouverts simultanément

  private roomsSubscription: Subscription | null = null;
  private roomUpdatedSubscription: Subscription | null = null;
  private messageSubscription: Subscription | null = null;
  // Ajouter des subscriptions pour les autres événements (roomCreated, userJoined, etc.) si nécessaire pour mettre à jour `this.rooms`

  constructor() {}

  ngOnInit(): void {
    // Obtenir l'utilisateur courant
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUser = user;
        if (user) {
          this.loadInitialRooms();
          this.subscribeToUserEvents();
        } else {
          this.cleanup(); // Nettoyer si l'utilisateur se déconnecte
        }
      });

    // S'abonner aux nouveaux messages
    this.messageSubscription = this.chatService
      .onMessageSent()
      .subscribe((message) => {
        const chatIndex = this.activeChats.findIndex(
          (c) => c.room._id === message.room
        );
        if (chatIndex > -1) {
          // Si le panneau est ouvert, le message sera géré par ChatPanelComponent
          // Si le panneau est fermé ou minimisé, incrémenter le compteur de non-lus
          if (!this.activeChats[chatIndex].isOpen) {
            this.activeChats[chatIndex].unreadCount++;
          }
          // Mettre à jour la room dans la liste principale aussi (optionnel)
          const roomListIndex = this.rooms.findIndex(
            (r) => r._id === message.room
          );
          if (roomListIndex > -1)
            this.rooms[roomListIndex].lastMessage = message;
        } else {
          // Mettre à jour le compteur de non-lus sur la room dans la liste principale
          const roomListIndex = this.rooms.findIndex(
            (r) => r._id === message.room
          );
          if (roomListIndex > -1) {
            this.rooms[roomListIndex].unreadCount =
              (this.rooms[roomListIndex].unreadCount || 0) + 1;
            this.rooms[roomListIndex].lastMessage = message;
          }
        }
      });

    this.roomUpdatedSubscription = this.chatService.onRoomUpdated().subscribe({
      next: (room) => {
        this.rooms = this.rooms.map((r) =>
          r._id === room._id ? { ...room, unreadCount: 0 } : r
        );
      },
      error: (err) => console.error('Error loading room updates:', err),
    });
  }

  ngOnDestroy(): void {
    // Normalement géré par takeUntilDestroyed, mais au cas où pour les subs manuelles
    this.roomsSubscription?.unsubscribe();
    this.roomUpdatedSubscription?.unsubscribe();
    this.messageSubscription?.unsubscribe();
    // messageSubscription est géré par takeUntilDestroyed
    this.cleanup();
  }

  cleanup(): void {
    this.rooms = [];
    this.activeChats = [];
    this.showChatList = false;
    this.roomsSubscription?.unsubscribe();
  }

  loadInitialRooms(): void {
    this.roomsSubscription = this.chatService.getMyRooms().subscribe({
      next: (rooms) => {
        // Initialiser unreadCount et hydrater le dernier message au 1er chargement
        this.rooms = rooms.map((r) => ({ ...r, unreadCount: r.unreadCount ?? 0 }));

        // // Hydratation du dernier message si manquant, en tâche de fond
        // const roomsNeedingLastMessage = this.rooms.filter((r) => !r.lastMessage);
        // const concurrency = 4;

        // const runWorker = async (queue: Room[]) => {
        //   while (queue.length) {
        //     const room = queue.shift()!;
        //     try {
        //       // On récupère 1 message le plus récent via HTTP
        //       const msgs = await firstValueFrom(this.chatService.getPaginatedMessages(room._id, 1));
        //       const last = msgs && msgs.length > 0 ? msgs[0] : undefined;
        //       if (last) {
        //         // Protection contre les courses: ne pas écraser un message plus récent éventuellement venu par socket
        //         this.rooms = this.rooms.map((r) => {
        //           if (r._id !== room._id) return r;
        //           const current = r.lastMessage;
        //           if (!current) return { ...r, lastMessage: last };
        //           const currentTs = new Date(current.createdAt).getTime();
        //           const incomingTs = new Date(last.createdAt).getTime();
        //           return incomingTs >= currentTs ? { ...r, lastMessage: last } : r;
        //         });
        //         // Demander une détection de changements si nécessaire
        //         this.cdr.markForCheck();
        //       }
        //     } catch (e) {
        //       // silencieux: l'UI affichera "Aucun message" pour cette room
        //       // console.error('Hydration lastMessage failed for room', room._id, e);
        //     }
        //   }
        // };

        // // Démarre quelques workers en parallèle
        // const queue = [...roomsNeedingLastMessage];
        // const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () =>
        //   runWorker(queue)
        // );
        // Promise.all(workers).then(() => {
        //   // Rien à faire; l'affichage se mettra à jour au fil des attributions
        // });
      },
      error: (err) => console.error('Error loading rooms:', err),
    });
  }

  subscribeToUserEvents(): void {
    // Écouter les notifications de nouveaux messages
    this.chatService
      .onNewMessageNotification()
      .pipe(takeUntilDestroyed(this.destroyRef)) // Utiliser destroyRef si disponible
      .subscribe((notification) => {
        this.handleNewMessageNotification(
          notification.roomId,
          notification.message
        );
      });

    // Écouter l'arrivée de nouvelles rooms
    this.chatService
      .onRoomCreated()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newRoom) => {
        this.handleNewRoom(newRoom);
      });

    // Écouter la suppression de rooms
    this.chatService
      .onRoomDeleted()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.handleRoomDeleted(data.roomId);
      });

    // Ajouter listeners pour onRoomUpdated, onRemovedFromRoom etc.
  }

  handleNewMessageNotification(roomId: string, message: Message): void {
    // Vérifier si le panneau pour cette room est déjà ouvert et actif
    const chatPanel = this.activeChats.find(
      (c) => c.room._id === roomId && c.isOpen
    );

    if (!chatPanel) {
      // Le panneau n'est pas ouvert -> mise à jour du badge/liste
      const roomIndex = this.rooms.findIndex((r) => r._id === roomId);
      if (roomIndex > -1) {
        this.rooms[roomIndex].unreadCount =
          (this.rooms[roomIndex].unreadCount || 0) + 1;
        this.rooms[roomIndex].lastMessage = message; // Mettre à jour le dernier message

        // Forcer la détection de changements si nécessaire (surtout si OnPush)
        this.cdr.markForCheck();

        // Afficher une notification
        const notifImage =
          this.rooms[roomIndex].image ||
          message.sender?.image ||
          'assets/default-avatar.png';
        const notifAction = () => {
          this.openChatPanel(this.rooms[roomIndex]); // Ouvre le panel si on clique sur l'action
        };
        const senderName = message.sender?.displayName || this.rooms[roomIndex].name;

        this.notificationService.showNotification(
          {
            title: senderName,
            content:
              message.content.slice(0, 30) +
              (message.content.length > 30 ? '...' : ''),
            image: notifImage,
            actions: [
              {
                label: 'Voir',
                action: notifAction,
              },
            ],
          },
          10000
        );
        this.notificationService.showSystemNotification(
          `Nouveau message de ${senderName} dans ${this.rooms[roomIndex].name}`,
          notifImage,
          notifAction
        );
      }
      // Si la room n'est pas dans la liste (cas étrange), on pourrait la charger
    }
    // Si le panel est ouvert, ChatPanelComponent gérera l'affichage via 'messageSent'
  }

  handleNewRoom(newRoom: Room): void {
    // Ajouter la room à la liste si elle n'existe pas déjà
    if (!this.rooms.some((r) => r._id === newRoom._id)) {
      this.rooms.push({ ...newRoom, unreadCount: 0 }); // Ajouter avec unreadCount à 0
      this.rooms.sort(
        (a, b) =>
          /* Logique de tri si nécessaire, ex: par date de dernière activité */ 0
      );
      this.cdr.markForCheck(); // Mettre à jour la vue
    }
  }

  handleRoomDeleted(roomId: string): void {
    this.rooms = this.rooms.filter((r) => r._id !== roomId);
    this.activeChats = this.activeChats.filter((c) => c.room._id !== roomId); // Fermer le panneau si ouvert
    this.cdr.markForCheck();
  }

  toggleChatList(): void {
    this.showChatList = !this.showChatList;
  }

  openChatPanel(room: Room): void {
    this.showChatList = false; // Fermer la liste en ouvrant un panneau
    const existingChatIndex = this.activeChats.findIndex(
      (c) => c.room._id === room._id
    );

    if (existingChatIndex > -1) {
      // Le chat existe déjà, on s'assure qu'il est ouvert et on reset les non-lus
      this.activeChats[existingChatIndex].isOpen = true;
      this.activeChats[existingChatIndex].unreadCount = 0;
      // Mettre à jour aussi dans la liste principale
      const roomListIndex = this.rooms.findIndex((r) => r._id === room._id);
      if (roomListIndex > -1) this.rooms[roomListIndex].unreadCount = 0;
    } else {
      // Nouveau chat à ouvrir
      if (
        this.activeChats.filter((c) => c.isOpen).length >= this.maxOpenPanels
      ) {
        // Trop de panneaux ouverts, fermer le plus ancien (ou autre logique)
        const openChats = this.activeChats.filter((c) => c.isOpen);
        if (openChats.length > 0) {
          // Ici on ferme le premier trouvé, adapter la logique si nécessaire
          const chatToClose = openChats[0];
          const indexToClose = this.activeChats.findIndex(
            (c) => c.room._id === chatToClose.room._id
          );
          if (indexToClose > -1) {
            this.activeChats[indexToClose].isOpen = false; // Marquer comme minimisé/fermé
            // On ne le supprime pas forcément pour garder l'état minimisé
          }
        }
      }
      // Ajouter le nouveau chat
      this.activeChats.push({ room: room, isOpen: true, unreadCount: 0 });
      // Mettre à jour aussi dans la liste principale
      const roomListIndex = this.rooms.findIndex((r) => r._id === room._id);
      if (roomListIndex > -1) this.rooms[roomListIndex].unreadCount = 0;
    }

    // Marquer les messages comme lus LOCALEMENT immédiatement (optimistic)
    // Le panneau le fera aussi via socket, mais ça améliore l'UX
    const roomInList = this.rooms.find((r) => r._id === room._id);
    if (roomInList) {
      roomInList.unreadCount = 0;
    }
    const activeChat = this.activeChats.find((c) => c.room._id === room._id);
    if (activeChat) {
      activeChat.unreadCount = 0;
    }

    // Assurer que ChatPanelComponent s'abonne aux updates de cette room
    // (sera fait dans le ngOnInit/ngOnDestroy du panel)
    this.cdr.markForCheck(); // Mettre à jour le badge total

    // S'assurer que les panneaux sont bien positionnés (peut être géré en CSS)
    this.positionPanels();
  }

  closeChatPanel(room: Room): void {
    const index = this.activeChats.findIndex((c) => c.room._id === room._id);
    if (index > -1) {
      this.activeChats.splice(index, 1);
      this.positionPanels(); // Mettre à jour les positions
    }
  }

  minimizeChatPanel(room: Room): void {
    const index = this.activeChats.findIndex((c) => c.room._id === room._id);
    if (index > -1) {
      this.activeChats[index].isOpen = false;
      this.positionPanels(); // Mettre à jour les positions
    }
  }

  getTotalUnreadCount(): number {
    let total = this.rooms.reduce(
      (sum, room) => sum + (room.unreadCount || 0),
      0
    );
    // S'assurer de ne pas compter deux fois si un chat est actif et a des non-lus (normalement non)
    // total += this.activeChats.filter(c => !c.isOpen).reduce((sum, chat) => sum + chat.unreadCount, 0);
    return total;
  }

  // Gère le positionnement CSS des panneaux ouverts
  positionPanels(): void {
    // Logique à implémenter si le CSS ne suffit pas (ex: calcul dynamique des offsets)
    // Peut être fait plus simplement avec flexbox et order en CSS.
  }

  getOpenChats(): ActiveChat[] {
    return this.activeChats.filter((c) => c.isOpen);
  }

  getMinimizedChats(): ActiveChat[] {
    // Ou simplement `activeChats` si on veut afficher les barres minimisées
    return this.activeChats.filter((c) => !c.isOpen);
  }
}
