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
  ViewChild
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
import { EmojiComponent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { NgScrollbar, NgScrollbarModule } from 'ngx-scrollbar';
import { NgScrollReached } from 'ngx-scrollbar/reached-event';
import { of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import {
  Message,
  MessageReaction,
  MessageSegment,
  ProcessedMessage,
  ProcessedReaction,
  SendMessageDto,
} from '../../core/models/message';
import { Room, UpdateRoomDto } from '../../core/models/room';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { UploadService } from '../../core/services/upload.service';
import { UserService } from '../../core/services/user.service';
import {
  EditChatDialogComponent,
  EditChatDialogResult,
} from '../edit-chat-dialog/edit-chat-dialog.component';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { FullScreenMediaDialogComponent } from '../full-screen-media-dialog/full-screen-media-dialog.component';

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
    EmojiComponent,
    MatDialogModule,
    NgScrollbarModule,
    NgScrollReached,
  ],
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss'],
  providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }],
})
export class ChatPanelComponent implements OnInit, OnDestroy {
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    this.closeEmojiPicker();
    this.closeMainEmojiGifPicker();
  }

  @Input({ required: true }) room!: Room;
  @Input({ required: true }) currentUser!: User | null;
  @Output() closePanel = new EventEmitter<Room>();
  @Output() minimizePanel = new EventEmitter<Room>();

  @ViewChild('messageContainer')
  private messageContainer!: NgScrollbar;
  @ViewChild('messageInput')
  private messageInput!: ElementRef<HTMLInputElement>;

  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private uploadService = inject(UploadService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  private users = signal<User[]>([]);
  private rawMessages = signal<Message[]>([]);
  private userNames: Map<string, string> = new Map();
  processedMessages: Signal<ProcessedMessage[]>;

  newMessageContent: string = '';
  isLoading = signal(false);
  isLoadingOlder = signal(false);
  hasMoreMessages = signal(true);
  private readonly initialLoadLimit = 30;
  private readonly paginationLimit = 20;
  readonly scrollThreshold = 100;

  showEmojiPickerFor: string | null = null;
  showMainEmojiGifPicker = signal(false); // Pour le sélecteur principal

  // Pour l'upload de fichiers et GIFs
  selectedFile: File | null = null;
  fileToUpload: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  uploadedMediaUrl: string | null = null;
  isDragging = signal(false);
  showPreview = signal(false);
  selectedGifUrl: string | null = null; // Pour stocker l'URL du GIF sélectionné

  constructor() {
    this.processedMessages = computed(() => {
      const messages = this.rawMessages();
      if (!messages || messages.length === 0) {
        return [];
      }

      const users = this.users();
      this.userNames.clear();
      users.forEach((user) => {
        this.userNames.set(user._id, user.displayName || user.username);
      });

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
        } else {
          const isSameSenderAsPrevious =
            !!prevMsg && prevMsg.sender!._id === msg.sender!._id;
          const isSameSenderAsNext =
            !!nextMsg && nextMsg.sender!._id === msg.sender!._id;

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

          const isSameMinuteAsPrevious =
            isSameSenderAsPrevious && msgMinuteKey === prevMsgMinuteKey;
          const isSameMinuteAsNext =
            isSameSenderAsNext && msgMinuteKey === nextMsgMinuteKey;

          showAvatarAndName = !isSameSenderAsPrevious;
          showTimestamp = !isSameMinuteAsNext;
          isGroupStart = !isSameSenderAsPrevious || !isSameMinuteAsPrevious;
          isGroupEnd = !isSameSenderAsNext || !isSameMinuteAsNext;
        }

        showDateSeparator = (() => {
          if (!prevMsg) return true;
          prevDate = new Date(prevMsg.createdAt);
          return (
            msgDate.getFullYear() !== prevDate.getFullYear() ||
            msgDate.getMonth() !== prevDate.getMonth() ||
            msgDate.getDate() !== prevDate.getDate()
          );
        })();

        return {
          ...msg,
          showAvatarAndName,
          showTimestamp,
          isGroupStart,
          isGroupEnd,
          showDateSeparator,
          isBotMessage,
          parsedContent: this.parseMessage(msg.content),
          parsedReactions: this.parseReactions(msg.reactions),
        };
      });
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadInitialMessages();
    this.subscribeToRoomEvents();
    this.chatService.subscribeToRoomUpdates(this.room._id);
  }

  ngOnDestroy(): void {
    this.chatService.unsubscribeFromRoomUpdates(this.room._id);
  }

  private loadUsers(): void {
    this.userService
      .findAllUsers()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (users) => {
          this.users.set(users);
        },
        error: (err) => {
          console.error('Error loading users:', err);
        },
      });
  }

  private loadInitialMessages(): void {
    this.isLoading.set(true);
    this.hasMoreMessages.set(true);
    this.chatService
      .getPaginatedMessages(this.room._id, this.initialLoadLimit)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (messages) => {
          const sortedMessages = messages.slice().reverse();
          this.rawMessages.set(sortedMessages);
          this.hasMoreMessages.set(messages.length === this.initialLoadLimit);
          queueMicrotask(() => this.scrollToBottom());
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

  private subscribeToRoomEvents(): void {
    this.chatService
      .onMessageSent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (message.room === this.room._id) {
          const isOwnMessage = message.sender?._id === this.currentUser?._id;
          this.rawMessages.update((currentMessages) => [
            ...currentMessages,
            { ...message, isRead: isOwnMessage },
          ]);
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

  private parseMessage(message: string): MessageSegment[] {
    const regex = /(:[a-zA-Z0-9_+:-]+:)/g;
    const parts = message.split(regex);
    return parts
      .filter((part) => part.trim().length > 0)
      .map((part) => {
        if (regex.test(part)) {
          return { type: 'emoji', content: part };
        }
        return { type: 'text', content: part };
      });
  }

  private parseReactions(reactions: MessageReaction[]): ProcessedReaction[] {
    const parsedReactions: ProcessedReaction[] = [];

    for (const reaction of reactions) {
      let tooltip = '';
      // Limiter l'affichage à 10 utilisateurs maximum
      if (reaction.userIds.length > 10) {
        if (this.currentUser?._id && reaction.userIds.includes(this.currentUser._id)) {
          tooltip = `Vous et ${reaction.userIds.length - 1} autres personnes`;
        } else {
          tooltip = `${reaction.userIds.length} personnes`;
        }
      } else {
        for (let i = 0; i < reaction.userIds.length; i++) {
          const userId = reaction.userIds[i];
          let userName = '';
          if (userId === this.currentUser?._id) {
            userName = 'Vous';
          } else {
            if (this.userNames.has(userId)) {
              userName = this.userNames.get(userId)!;
            } else {
              userName = 'Utilisateur inconnu';
              console.warn(`Nom d'utilisateur inconnu pour ID ${userId}`);
            }
          }
          if (i === 0) {
            tooltip = userName;
          } else if (i === reaction.userIds.length - 1) {
            tooltip += ` et ${userName}`;
          } else {
            tooltip += `, ${userName}`;
          }
        }
      }
      parsedReactions.push({ ...reaction, tooltip });
    }

    return parsedReactions;
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

    this.chatService
      .getPaginatedMessages(this.room._id, this.paginationLimit, beforeDate)
      .pipe(
        finalize(() => this.isLoadingOlder.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (olderMessages) => {
          if (olderMessages.length === 0) {
            this.hasMoreMessages.set(false);
            return;
          }

          const sortedOlderMessages = olderMessages.slice().reverse();

          this.rawMessages.update((current) => [
            ...sortedOlderMessages,
            ...current,
          ]);
          this.hasMoreMessages.set(
            olderMessages.length === this.paginationLimit
          );
        },
        error: (err) =>
          console.error(
            `Error loading older messages for room ${this.room._id}:`,
            err
          ),
      });
  }

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

  onScroll(): void {
    if (this.isLoadingOlder() || !this.hasMoreMessages()) {
      return;
    }

    this.loadOlderMessages();
  }

  sendMessage(): void {
    if (!this.currentUser) {
      return;
    }

    if (this.fileToUpload && !this.uploadedMediaUrl) {
      return;
    }

    if (
      !this.newMessageContent.trim() &&
      !this.uploadedMediaUrl &&
      !this.selectedGifUrl
    ) {
      return;
    }

    const messageData: SendMessageDto = {
      room: this.room._id,
      content: this.newMessageContent,
      sender: this.currentUser,
      mediaUrl: this.uploadedMediaUrl ?? this.selectedGifUrl ?? undefined, // Utilise le GIF si présent
    };

    this.chatService.sendMessage(messageData);
    this.newMessageContent = '';
    this.selectedFile = null;
    this.fileToUpload = null;
    this.previewUrl = null;
    this.uploadedMediaUrl = null;
    this.uploadError.set(null);
    this.showPreview.set(false);
    this.selectedGifUrl = null; // Réinitialiser l'URL du GIF
    this.scrollToBottom();
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
    element.value = '';
  }

  private handleFile(file: File): void {
    this.uploadError.set(null);
    this.uploadedMediaUrl = null;
    this.selectedGifUrl = null; // Annuler la sélection de GIF si un fichier est uploadé
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
    this.previewUrl = null;

    const reader = new FileReader();
    reader.onload = (e) => (this.previewUrl = reader.result);
    reader.readAsDataURL(file);
    this.fileToUpload = file;
    this.showPreview.set(true);
  }

  confirmAndSendFile(): void {
    if ((!this.fileToUpload && !this.selectedGifUrl) || !this.currentUser) {
      return;
    }

    if (this.selectedGifUrl) {
      this.uploadedMediaUrl = this.selectedGifUrl;
      this.sendMessage();
    } else if (this.fileToUpload) {
      this.isUploading.set(true);
      this.uploadError.set(null);

      this.uploadService
        .uploadChatMedia(this.fileToUpload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap((response) => {
            this.uploadedMediaUrl = '/api/data/' + response.url;
            this.sendMessage();
          }),
          catchError((error) => {
            console.error("Erreur d'upload:", error);
            this.uploadError.set(
              "Erreur lors de l'upload du fichier. Veuillez réessayer."
            );
            this.cancelFileSelection();
            return of(null);
          }),
          finalize(() => {
            this.isUploading.set(false);
          })
        )
        .subscribe();
    }
  }

  cancelFileSelection(): void {
    this.selectedFile = null;
    this.fileToUpload = null;
    this.previewUrl = null;
    this.uploadedMediaUrl = null;
    this.uploadError.set(null);
    this.isUploading.set(false);
    this.showPreview.set(false);
    this.selectedGifUrl = null; // Annuler la sélection de GIF
  }

  // --- Fin de la gestion de l'upload ---

  toggleEmojiGifPicker(): void {
    this.showMainEmojiGifPicker.update((val) => !val);
    if (this.showMainEmojiGifPicker()) {
      this.closeEmojiPicker(); // Fermer le picker de réaction si le principal s'ouvre
    }
  }

  closeMainEmojiGifPicker(): void {
    this.showMainEmojiGifPicker.set(false);
  }

  openEmojiPicker(messageId: string) {
    this.showEmojiPickerFor = messageId;
    this.closeMainEmojiGifPicker(); // Fermer le picker principal si celui de réaction s'ouvre
  }

  closeEmojiPicker() {
    this.showEmojiPickerFor = null;
  }

  insertEmojiAtCursor(emojiId: string): void {
    const inputElement = this.messageInput.nativeElement;
    const start = inputElement.selectionStart || 0;
    const end = inputElement.selectionEnd || 0;

    this.newMessageContent =
      this.newMessageContent.substring(0, start) +
      emojiId +
      this.newMessageContent.substring(end, this.newMessageContent.length);

    // Mettre à jour la position du curseur
    const newCursorPosition = start + emojiId.length;
    // Utiliser queueMicrotask pour s'assurer que le DOM est mis à jour avant de définir la sélection
    queueMicrotask(() => {
      inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
      inputElement.focus();
    });
  }

  handleGifSelection(gifUrl: string): void {
    this.cancelFileSelection(); // Annuler toute sélection de fichier existante
    this.selectedGifUrl = gifUrl;
    this.previewUrl = gifUrl; // Utiliser l'URL du GIF pour la prévisualisation
    this.showPreview.set(true);
  }

  addReaction(messageId: string, emoji: string) {
    this.chatService.addReaction({ messageId, emoji });
  }

  toggleReaction(messageId: string, emoji: string) {
    if (!this.currentUser?._id) return;
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
    setTimeout(() => {
      try {
        if (this.messageContainer) {
          this.messageContainer.scrollToElement(
            `#message-${this.processedMessages().length - 1}`,
            { duration: 500 }
          );
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
      return;
    }

    const dialogRef = this.dialog.open(EditChatDialogComponent, {
      width: '500px',
      data: { room: this.room },
      disableClose: true,
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
            this.chatService.updateRoom(updateDto);
          }
        }
      });
  }

  openFullScreenMedia(mediaUrl: string): void {
    this.dialog.open(FullScreenMediaDialogComponent, {
      data: { mediaUrl },
      panelClass: 'full-screen-media-dialog',
    });
  }
}
