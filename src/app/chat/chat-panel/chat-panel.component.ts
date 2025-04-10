// src/app/features/chat/components/chat-panel/chat-panel.component.ts
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Signal,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { finalize } from 'rxjs';
import {
  Message,
  ProcessedMessage,
  SendMessageDto,
} from '../../core/models/message';
import { Room } from '../../core/models/room';
import { User } from '../../core/models/user';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat-panel',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss'],
})
export class ChatPanelComponent implements OnInit, OnDestroy {
  @Input({ required: true }) room!: Room;
  @Input({ required: true }) currentUser!: User | null;
  @Output() closePanel = new EventEmitter<Room>();
  @Output() minimizePanel = new EventEmitter<Room>(); // Ou juste close

  @ViewChild('messageContainer')
  private messageContainer!: ElementRef<HTMLElement>;
  @ViewChild('messageInput')
  private messageInput!: ElementRef<HTMLInputElement>;

  private chatService = inject(ChatService);
  private destroyRef = inject(DestroyRef);

  private rawMessages = signal<Message[]>([]);
  processedMessages: Signal<ProcessedMessage[]>;

  newMessageContent: string = '';
  isLoading = signal(false);
  isLoadingOlder = signal(false);
  hasMoreMessages = signal(true); // Assumer qu'il y en a plus au début
  private readonly initialLoadLimit = 30;
  private readonly paginationLimit = 20;

  constructor() {
    this.processedMessages = computed(() => {
      const messages = this.rawMessages();
      if (!messages || messages.length === 0) {
        return [];
      }

      return messages.map((msg, index, arr): ProcessedMessage => {
        const prevMsg = index > 0 ? arr[index - 1] : null;
        const nextMsg = index < arr.length - 1 ? arr[index + 1] : null;

        const isSameSenderAsPrevious =
          !!prevMsg && prevMsg.sender._id === msg.sender._id;
        const isSameSenderAsNext =
          !!nextMsg && nextMsg.sender._id === msg.sender._id;

        // Comparaison précise de la minute (ignorant secondes/ms)
        const msgDate = new Date(msg.createdAt);
        const getMinutesKey = (date: Date | null) =>
          date
            ? `<span class="math-inline">\{date\.getFullYear\(\)\}\-</span>{date.getMonth()}-<span class="math-inline">\{date\.getDate\(\)\}\_</span>{date.getHours()}:${date.getMinutes()}`
            : null;
        const msgMinuteKey = getMinutesKey(msgDate);
        const prevMsgMinuteKey = getMinutesKey(
          prevMsg ? new Date(prevMsg.createdAt) : null
        );
        const nextMsgMinuteKey = getMinutesKey(
          nextMsg ? new Date(nextMsg.createdAt) : null
        );

        const isSameMinuteAsPrevious =
          isSameSenderAsPrevious && msgMinuteKey === prevMsgMinuteKey;
        const isSameMinuteAsNext =
          isSameSenderAsNext && msgMinuteKey === nextMsgMinuteKey;

        // Déterminer l'affichage
        const showAvatarAndName = !isSameSenderAsPrevious;
        // Afficher l'heure si le message suivant n'est PAS du même auteur DANS la même minute
        const showTimestamp = !isSameMinuteAsNext;
        const isGroupStart = !isSameSenderAsPrevious;
        const isGroupEnd = !isSameSenderAsNext;

        return {
          ...msg, // Copie les propriétés du message original
          showAvatarAndName,
          showTimestamp,
          isGroupStart,
          isGroupEnd,
        };
      });
    });
  }

  ngOnInit(): void {
    this.loadInitialMessages(); // Charge les premiers messages
    this.subscribeToRoomEvents(); // S'abonne aux nouveaux messages pour CETTE room
    // S'abonner aux updates spécifiques à CETTE room (via socket)
    this.chatService.subscribeToRoomUpdates(this.room._id);
  }

  ngOnDestroy(): void {
    // Se désabonner des updates spécifiques à CETTE room (via socket)
    this.chatService.unsubscribeFromRoomUpdates(this.room._id);
  }

  // Mettre à jour rawMessages lors du chargement initial
  private loadInitialMessages(): void {
    this.isLoading.set(true);
    this.hasMoreMessages.set(true); // Réinitialiser
    this.chatService
      .getPaginatedMessages(this.room._id, this.initialLoadLimit)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (messages) => {
          // Les messages arrivent du plus récent au plus ancien via l'API
          // Inverser pour affichage chronologique standard (optionnel, dépend de l'API)
          const sortedMessages = messages.slice().reverse(); // Créer une copie et inverser
          this.rawMessages.set(sortedMessages);
          this.hasMoreMessages.set(messages.length === this.initialLoadLimit); // S'il y a moins de messages que la limite, on a tout chargé
          queueMicrotask(() => this.scrollToBottom()); // Scroll vers le bas après chargement initial
          this.markAsRead();
        },
        error: (err) => {
          console.error(
            `Error loading initial messages for room ${this.room._id}:`,
            err
          );
        },
      });
  }

  // Mettre à jour rawMessages à la réception d'un nouveau message
  private subscribeToRoomEvents(): void {
    this.chatService
      .onMessageSent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (message.room === this.room._id) {
          const isOwnMessage = message.sender._id === this.currentUser?._id;
          // Ajoute le nouveau message au signal existant
          this.rawMessages.update((currentMessages) => [
            ...currentMessages,
            { ...message, isRead: isOwnMessage },
          ]);
          // Scroll après la mise à jour du DOM
          queueMicrotask(() => this.scrollToBottom());
          this.markAsRead();
        }
      });
  }

  private markAsRead() {
    this.chatService.markRoomAsRead(this.room._id);
  }

  private loadOlderMessages(): void {
    this.isLoadingOlder.set(true);
    const currentMessages = this.rawMessages();
    const oldestMessage =
      currentMessages.length > 0 ? currentMessages[0] : null;
    const beforeDate = oldestMessage
      ? new Date(oldestMessage.createdAt)
      : undefined;

    // Sauvegarder l'état du scroll avant de charger
    const element = this.messageContainer.nativeElement;
    const oldScrollHeight = element.scrollHeight;
    // const oldScrollTop = element.scrollTop; // scrollTop est proche de 0

    this.chatService
      .getPaginatedMessages(this.room._id, this.paginationLimit, beforeDate)
      .pipe(
        finalize(() => this.isLoadingOlder.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (olderMessages) => {
          if (olderMessages.length === 0) {
            this.hasMoreMessages.set(false); // Plus rien à charger
            return;
          }

          // Messages reçus du plus récent au plus ancien (dans la page)
          const sortedOlderMessages = olderMessages.slice().reverse(); // Inverser pour préfixer correctement

          // Préfixer les anciens messages au signal
          this.rawMessages.update((current) => [
            ...sortedOlderMessages,
            ...current,
          ]);
          this.hasMoreMessages.set(
            olderMessages.length === this.paginationLimit
          );

          // Restaurer la position de scroll après mise à jour du DOM
          queueMicrotask(() => {
            try {
              element.scrollTop = element.scrollHeight - oldScrollHeight;
            } catch (e) {
              console.error('Scroll restoration failed', e);
            }
          });
        },
        error: (err) =>
          console.error(
            `Error loading older messages for room ${this.room._id}:`,
            err
          ),
      });
  }

  onScroll(): void {
    if (this.isLoadingOlder() || !this.hasMoreMessages()) {
      return; // Ne rien faire si déjà en chargement ou si tout est chargé
    }

    const element = this.messageContainer.nativeElement;
    // Déclencher légèrement avant d'atteindre le sommet
    if (element.scrollTop < 50) {
      this.loadOlderMessages();
    }
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.currentUser) return;

    const messageData: SendMessageDto = {
      room: this.room._id,
      content: this.newMessageContent,
      sender: this.currentUser,
    };

    this.chatService.sendMessage(messageData);
    this.newMessageContent = '';
    this.scrollToBottom();
    // Focus sur l'input après envoi
    this.messageInput.nativeElement.focus();
  }

  close(): void {
    this.closePanel.emit(this.room);
  }

  minimize(): void {
    this.minimizePanel.emit(this.room);
  }

  scrollToBottom(): void {
    // Utiliser setTimeout pour s'assurer que le DOM est mis à jour avant de scroller
    setTimeout(() => {
      try {
        if (this.messageContainer) {
          this.messageContainer.nativeElement.scrollTop =
            this.messageContainer.nativeElement.scrollHeight;
        }
      } catch (err) {
        console.error('Could not scroll to bottom:', err);
      }
    }, 0);
  }
}
