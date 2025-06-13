// src/app/features/chat/components/chat-panel/chat-panel.component.ts
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  LOCALE_ID,
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import {
  Message,
  ProcessedMessage,
  SendMessageDto,
} from '../../core/models/message';
import { Room, UpdateRoomDto } from '../../core/models/room';
import { User } from '../../core/models/user';
import { ChatService } from '../../core/services/chat.service';
import { UploadService } from '../../core/services/upload.service'; // Ajout
import {
  EditChatDialogComponent,
  EditChatDialogResult,
} from '../edit-chat-dialog/edit-chat-dialog.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';

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
    EmojiPickerComponent,
    MatDialogModule, // Ajout pour MatDialog
  ],
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss'],
  providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }],
})
export class ChatPanelComponent implements OnInit, OnDestroy {
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    this.closeEmojiPicker();
  }

  @Input({ required: true }) room!: Room;
  @Input({ required: true }) currentUser!: User | null;
  @Output() closePanel = new EventEmitter<Room>();
  @Output() minimizePanel = new EventEmitter<Room>(); // Ou juste close


  @ViewChild('messageContainer')
  private messageContainer!: ElementRef<HTMLElement>;
  @ViewChild('messageInput')
  private messageInput!: ElementRef<HTMLInputElement>;

  private chatService = inject(ChatService);
  private uploadService = inject(UploadService); // Ajout
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  private rawMessages = signal<Message[]>([]);
  processedMessages: Signal<ProcessedMessage[]>;

  newMessageContent: string = '';
  isLoading = signal(false);
  isLoadingOlder = signal(false);
  hasMoreMessages = signal(true); // Assumer qu'il y en a plus au début
  private readonly initialLoadLimit = 30;
  private readonly paginationLimit = 20;

  showEmojiPickerFor: string | null = null;

  // Pour l'upload de fichiers
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  uploadedMediaUrl: string | null = null; // Changé de private à public
  isDragging = signal(false);

  constructor() {
    this.processedMessages = computed(() => {
      const messages = this.rawMessages();
      if (!messages || messages.length === 0) {
        return [];
      }

      return messages.map((msg, index, arr): ProcessedMessage => {
        const prevMsg = index > 0 ? arr[index - 1] : null;
        const nextMsg = index < arr.length - 1 ? arr[index + 1] : null;

        const isBotMessage = msg.sender === null;

        let showAvatarAndName: boolean;
        let showTimestamp: boolean;
        let isGroupStart: boolean;
        let isGroupEnd: boolean;
        let showDateSeparator: boolean;

        const msgDate = new Date(msg.createdAt);
        let prevDate: Date | null = null;

        if (isBotMessage) {
          showAvatarAndName = true;
          showTimestamp = true;
          isGroupStart = true;
          isGroupEnd = true;
          showDateSeparator = true;
        } else {
          const isSameSenderAsPrevious = !!prevMsg && prevMsg.sender!._id === msg.sender!._id;
          const isSameSenderAsNext = !!nextMsg && nextMsg.sender!._id === msg.sender!._id;

          const getMinutesKey = (date: Date | null) =>
            date
              ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}_${date.getHours()}:${date.getMinutes()}`
              : null;
          const msgMinuteKey = getMinutesKey(msgDate);
          const prevMsgMinuteKey = getMinutesKey(
            prevMsg ? new Date(prevMsg.createdAt) : null
          );
          const nextMsgMinuteKey = getMinutesKey(
            nextMsg ? new Date(nextMsg.createdAt) : null
          );

          const isSameMinuteAsPrevious = isSameSenderAsPrevious && msgMinuteKey === prevMsgMinuteKey;
          const isSameMinuteAsNext = isSameSenderAsNext && msgMinuteKey === nextMsgMinuteKey;

          showAvatarAndName = !isSameSenderAsPrevious;
          showTimestamp = !isSameMinuteAsNext;
          isGroupStart = !isSameSenderAsPrevious || !isSameMinuteAsPrevious;
          isGroupEnd = !isSameSenderAsNext || !isSameMinuteAsNext;

          showDateSeparator = (() => {
            if (!prevMsg) return true;
            prevDate = new Date(prevMsg.createdAt);
            return (
              msgDate.getFullYear() !== prevDate.getFullYear() ||
              msgDate.getMonth() !== prevDate.getMonth() ||
              msgDate.getDate() !== prevDate.getDate()
            );
          })();
        }

        return {
          ...msg, // Copie les propriétés du message original
          showAvatarAndName,
          showTimestamp,
          isGroupStart,
          isGroupEnd,
          showDateSeparator,
          isBotMessage,
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
          const isOwnMessage = message.sender?._id === this.currentUser?._id;
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
    this.chatService
      .onMessageUpdated()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (message.room === this.room._id) {
          const isOwnMessage = message.sender?._id === this.currentUser?._id;
          // Ajoute le nouveau message au signal existant
          this.rawMessages.update((currentMessages) =>
            currentMessages.map((msg) =>
              msg._id === message._id ? message : msg
            )
          );
        }
      });

    this.chatService
      .onRoomUpdated()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (room) => {
          this.room = room;
        },
        error: (err) => console.error('Error loading room updates:', err),
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
    if (
      (!this.newMessageContent.trim() && !this.uploadedMediaUrl) ||
      !this.currentUser
    ) {
      return;
    }

    const messageData: SendMessageDto = {
      room: this.room._id,
      content: this.newMessageContent,
      sender: this.currentUser,
      mediaUrl: this.uploadedMediaUrl ?? undefined,
    };

    this.chatService.sendMessage(messageData);
    this.newMessageContent = '';
    this.selectedFile = null;
    this.previewUrl = null;
    this.uploadedMediaUrl = null;
    this.uploadError.set(null);
    this.scrollToBottom();
    // Focus sur l'input après envoi
    this.messageInput.nativeElement.focus();
  }

  // --- Gestion de l'upload de fichiers ---

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.items && event.dataTransfer.items.length > 0) {
      this.isDragging.set(true);
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Vérifier si le curseur quitte vraiment la zone (et non un enfant)
    const target = event.target as HTMLElement;
    if (
      target === this.messageContainer.nativeElement ||
      !this.messageContainer.nativeElement.contains(target)
    ) {
      this.isDragging.set(false);
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
      // Réinitialiser le dataTransfer pour éviter les problèmes
      if (event.dataTransfer) {
        event.dataTransfer.clearData();
      }
    }
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (file) {
      this.handleFile(file);
    }
    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    element.value = '';
  }

  private handleFile(file: File): void {
    this.uploadError.set(null);
    this.uploadedMediaUrl = null;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      this.uploadError.set(
        'Type de fichier non supporté. Veuillez sélectionner une image (jpg, png, webp) ou un GIF.'
      );
      this.selectedFile = null;
      this.previewUrl = null;
      return;
    }

    if (file.size > maxSize) {
      this.uploadError.set('Le fichier est trop volumineux (max 5MB).');
      this.selectedFile = null;
      this.previewUrl = null;
      return;
    }

    this.selectedFile = file;
    this.previewUrl = null; // Réinitialiser au cas où

    // Afficher l'aperçu
    const reader = new FileReader();
    reader.onload = (e) => (this.previewUrl = reader.result);
    reader.readAsDataURL(file);

    this.uploadFile(); // Lancer l'upload directement après la sélection
  }

  private uploadFile(): void {
    if (!this.selectedFile || !this.currentUser) return;

    this.isUploading.set(true);
    this.uploadError.set(null);

    this.uploadService
      .uploadChatMedia(this.selectedFile)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((response) => {
          this.uploadedMediaUrl = '/api/data/' + response.url;
          // Si l'utilisateur n'a pas tapé de texte, on peut envoyer directement le média
          if (!this.newMessageContent.trim()) {
            this.sendMessage();
          }
        }),
        catchError((error) => {
          console.error("Erreur d'upload:", error);
          this.uploadError.set(
            "Erreur lors de l'upload du fichier. Veuillez réessayer."
          );
          this.selectedFile = null;
          this.previewUrl = null;
          this.uploadedMediaUrl = null;
          return of(null); // Gérer l'erreur et continuer
        }),
        finalize(() => {
          this.isUploading.set(false);
          // Ne pas réinitialiser selectedFile et previewUrl ici,
          // car l'utilisateur pourrait vouloir ajouter du texte avant d'envoyer.
          // Ils seront réinitialisés dans sendMessage.
        })
      )
      .subscribe();
  }

  cancelUpload(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.uploadedMediaUrl = null;
    this.uploadError.set(null);
    this.isUploading.set(false);
  }

  // --- Fin de la gestion de l'upload ---

  openEmojiPicker(messageId: string) {
    this.showEmojiPickerFor = messageId;
  }

  closeEmojiPicker() {
    this.showEmojiPickerFor = null;
  }

  addReaction(messageId: string, emoji: string) {
    // Appelle le service pour ajouter la réaction (optimiste possible)
    this.chatService.addReaction({ messageId, emoji });
  }

  toggleReaction(messageId: string, emoji: string) {
    if (!this.currentUser?._id) return;
    // Si l'utilisateur a déjà réagi, retire la réaction, sinon ajoute
    const message = this.rawMessages().find((msg) => msg._id === messageId);
    const reaction = message?.reactions?.find((r) => r.emoji === emoji);
    const alreadyReacted = reaction?.userIds.includes(this.currentUser._id);

    if (alreadyReacted) {
      this.chatService.removeReaction({ messageId, emoji });
    } else {
      this.chatService.addReaction({ messageId, emoji });
    }
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

  openEditRoomDialog(): void {
    if (
      !this.room ||
      !this.currentUser ||
      this.room.creator?._id !== this.currentUser._id
    ) {
      console.warn('Only the room creator can edit the room.');
      // Optionnel: Afficher une notification à l'utilisateur
      return;
    }

    const dialogRef = this.dialog.open(EditChatDialogComponent, {
      width: '500px', // ou la largeur souhaitée
      data: { room: this.room },
      disableClose: true, // Empêcher la fermeture en cliquant à l'extérieur ou avec Echap
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: EditChatDialogResult | undefined) => {
        if (result && this.room) {
          if (result.delete) {
            this.chatService.deleteRoom(this.room._id);
            this.close();
          } else {
            const updateDto: UpdateRoomDto = {
              roomId: this.room._id,
              name: result.name,
              image: result.image,
              userIds: result.userIds,
            };
            // Le service backend attend l'ID de l'utilisateur qui fait la requête pour la vérification des droits.
            // Dans un vrai scénario, cela viendrait du token. Ici, nous le passons explicitement.
            // Note: La méthode updateRoom du service socket n'est pas conçue pour passer le requestingUserId.
            // Il faudrait soit modifier le backend pour le prendre du socket.handshake.auth,
            // soit créer une nouvelle méthode HTTP pour cela, ou adapter l'event socket.
            // Pour l'instant, on va supposer que le backend le gère via le token de l'utilisateur connecté au socket.
            this.chatService.updateRoom(updateDto);
            // Idéalement, attendre la confirmation de la mise à jour via un événement socket 'roomUpdated'
            // et mettre à jour this.room localement.
          }
        }
      });
  }
}
