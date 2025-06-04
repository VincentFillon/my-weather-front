// src/app/chat/edit-chat-dialog/edit-chat-dialog.component.ts
import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import { Room } from '../../core/models/room';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
// ChatService n'est pas directement utilisé ici pour modifier, seulement pour charger les utilisateurs potentiels si besoin.
// La modification effective sera faite par le composant appelant.

export interface EditChatDialogData {
  room: Room;
}

export interface EditChatDialogResult {
  name: string;
  image?: string;
  userIds: string[];
}

@Component({
  selector: 'app-edit-chat-dialog',
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
    MatProgressSpinnerModule,
  ],
  templateUrl: './edit-chat-dialog.component.html',
  styleUrls: ['./edit-chat-dialog.component.scss'],
})
export class EditChatDialogComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private dialogRef = inject(MatDialogRef<EditChatDialogComponent, EditChatDialogResult>);

  allUsers$ = new BehaviorSubject<User[]>([]); // Tous les utilisateurs potentiels
  usersSub?: Subscription;
  filteredUsers$!: Observable<User[]>;
  searchTerm$ = new BehaviorSubject<string>('');
  isLoading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);

  selectedUserIds: string[] = [];
  chatRoomName: string | null = null;
  chatRoomImage: string | null = null;
  imagePreview: string | null = null;

  public roomCreatorId: string | undefined; // Rendu public

  constructor(@Inject(MAT_DIALOG_DATA) public data: EditChatDialogData) {
    if (this.data.room) {
      this.chatRoomName = this.data.room.name;
      this.chatRoomImage = this.data.room.image || null;
      this.imagePreview = this.data.room.image || 'assets/default-group-avatar.png'; // Default to group if no image
      this.selectedUserIds = this.data.room.users.map(u => u._id);
      this.roomCreatorId = this.data.room.creator?._id;
    }
  }

  ngOnInit(): void {
    this.loadUsers();

    this.filteredUsers$ = combineLatest([this.allUsers$, this.searchTerm$]).pipe(
      map(([users, term]) => {
        if (!term) {
          return users;
        }
        const lowerTerm = term.toLowerCase();
        return users.filter(
          (user) =>
            (user.displayName?.toLowerCase().includes(lowerTerm) ||
            user.username?.toLowerCase().includes(lowerTerm)) &&
            user._id !== this.roomCreatorId // Exclure le créateur de la liste filtrable
        );
      }),
      startWith([])
    );
  }

  ngOnDestroy(): void {
    this.usersSub?.unsubscribe();
  }

  loadUsers(): void {
    this.isLoading$.next(true);
    this.error$.next(null);
    // Charger tous les utilisateurs, le filtrage du créateur se fait dans filteredUsers$
    // et la pré-sélection est gérée par `selectedUserIds` et `isSelected` dans le template.
    this.usersSub = this.userService.findAllUsers().subscribe({
      next: (users) => {
        // Exclure le créateur de la liste des utilisateurs sélectionnables
        this.allUsers$.next(users.filter(user => user._id !== this.roomCreatorId));
        this.isLoading$.next(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
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
    this.selectedUserIds = event.source.selectedOptions.selected.map(
      (option) => option.value._id // L'option value est l'objet User complet
    );
    // S'assurer que le créateur est toujours inclus s'il était sélectionné initialement
    // (ce qui ne devrait pas arriver car il n'est pas dans la liste sélectionnable, mais par sécurité)
    if (this.roomCreatorId && !this.selectedUserIds.includes(this.roomCreatorId)) {
       // Cette logique est délicate : le créateur ne doit pas être désélectionnable.
       // Il est plus simple de l'exclure de la liste des sélectionnables et de l'ajouter à la fin.
    }

    if (!this.chatRoomImage) { // Si l'utilisateur n'a pas défini d'image personnalisée
      if (this.selectedUserIds.length > 1) { // Plus le créateur qui sera ajouté
        this.imagePreview = 'assets/default-group-avatar.png';
      } else {
        this.imagePreview = 'assets/default-avatar.png';
      }
    }
  }

  isSelected(user: User): boolean {
    return this.selectedUserIds.includes(user._id);
  }

  confirmSelection(): void {
    if (!this.chatRoomName) {
        console.error('Chat room name is required.');
        return;
    }
    // S'assurer que le créateur est toujours dans la liste des userIds
    let finalUserIds = [...this.selectedUserIds];
    if (this.roomCreatorId && !finalUserIds.includes(this.roomCreatorId)) {
      finalUserIds.push(this.roomCreatorId);
    }

    // Empêcher une room sans utilisateur (au moins le créateur)
    if (finalUserIds.length === 0 && this.roomCreatorId) {
        finalUserIds.push(this.roomCreatorId); // Assurer que le créateur y est au moins
    } else if (finalUserIds.length === 0 && !this.roomCreatorId) {
        console.error('Cannot create a room without users and no creator context.');
        return;
    }


    const result: EditChatDialogResult = {
      name: this.chatRoomName,
      image: this.chatRoomImage ?? this.imagePreview ?? undefined,
      userIds: finalUserIds,
    };
    this.dialogRef.close(result);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
