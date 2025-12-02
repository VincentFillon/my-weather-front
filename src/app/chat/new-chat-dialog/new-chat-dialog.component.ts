// src/app/features/chat/components/new-chat-dialog/new-chat-dialog.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  combineLatest,
  map,
  startWith,
} from 'rxjs';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { UserService } from '../../core/services/user.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';

export interface NewChatDialogResult {
  name: string;
  image?: string;
  userIds: string[];
  creatorId: string;
}

@Component({
  selector: 'app-new-chat-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AvatarComponent,
  ],
  templateUrl: './new-chat-dialog.component.html',
  styleUrls: ['./new-chat-dialog.component.scss'],
})
export class NewChatDialogComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private chatService = inject(ChatService);
  private dialogRef = inject(MatDialogRef<NewChatDialogComponent>);

  users$ = new BehaviorSubject<User[]>([]);
  usersRoomsSub?: Subscription;
  filteredUsers$!: Observable<User[]>;
  searchTerm$ = new BehaviorSubject<string>('');
  isLoading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);

  selectedUsers: User[] = [];
  chatRoomName: string | null = null;

  chatRoomImage: string | null = null;
  imagePreview = 'assets/default-avatar.png';

  ngOnInit(): void {
    this.loadUsers();

    this.filteredUsers$ = combineLatest([this.users$, this.searchTerm$]).pipe(
      map(([users, term]) => {
        if (!term) {
          return users;
        }
        const lowerTerm = term.toLowerCase();
        return users.filter(
          (user) =>
            user.displayName?.toLowerCase().includes(lowerTerm) ||
            user.username?.toLowerCase().includes(lowerTerm)
        );
      }),
      startWith([]) // Éviter les erreurs avant la première émission
    );
  }

  ngOnDestroy(): void {
    this.usersRoomsSub?.unsubscribe();
  }

  loadUsers(): void {
    this.isLoading$.next(true);
    this.error$.next(null);
    this.usersRoomsSub = combineLatest([
      this.userService.findAllUsers(),
      this.chatService.getMyRooms(),
    ]).subscribe({
      next: ([users, rooms]) => {
        const oneToOneRooms = rooms.filter((room) => room.users.length === 2);
        const oneToOneUserIds = oneToOneRooms.flatMap((room) =>
          room.users.map((user) => user._id)
        );
        const currentUser = this.authService.currentUser();

        this.users$.next(
          users.filter(
            (user) =>
              !oneToOneUserIds.includes(user._id) &&
              user._id !== currentUser?._id
          )
        );
        this.isLoading$.next(false);
      },
      error: (err) => {
        console.error('Error loading eligible users:', err);
        this.error$.next('Impossible de charger les utilisateurs.');
        this.isLoading$.next(false);
      },
    });
  }

  onSearchTermChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm$.next(inputElement.value);
  }

  onSelectionChange(event: MatSelectionListChange): void {
    this.selectedUsers = event.source.selectedOptions.selected.map(
      (option) => option.value
    );
    if (!this.chatRoomImage) {
      if (this.selectedUsers.length > 1) {
        this.imagePreview = 'assets/default-group-avatar.png';
      } else {
        this.imagePreview = 'assets/default-avatar.png';
      }
    }
  }

  confirmSelection(): void {
    const currentUser = this.authService.currentUser();
    if (!this.chatRoomName || this.selectedUsers.length < 1 || !currentUser?._id) {
      // Gérer le cas où l'utilisateur actuel n'est pas défini, bien que peu probable ici
      console.error('Current user not found or invalid selection for room creation.');
      return;
    }

    const result: NewChatDialogResult = {
      name: this.chatRoomName,
      image: this.chatRoomImage || this.imagePreview,
      userIds: this.selectedUsers.map((user) => user._id),
      creatorId: currentUser._id,
    };
    // Note: Le dialogRef.close(result) est correct.
    // C'est le composant qui ouvre ce dialogue qui appellera chatService.createRoom
    // avec les données de 'result'.
    this.dialogRef.close(result);
  }

  closeDialog(): void {
    this.dialogRef.close(); // Fermer sans sélection
  }
}
