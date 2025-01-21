import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { Mood } from '../../core/models/mood';
import { Role } from '../../core/models/role.enum';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { MoodService } from '../../core/services/mood.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    DragDropModule,
    MatMenuModule,
    MatDividerModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
  ],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
})
export class BoardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private moodService = inject(MoodService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  currentUser: User | null = null;
  isAdmin = false;
  moods: Mood[] = [];
  moodsIds: string[] = [];
  medianMood: Mood | null = null;

  users: User[] = [];
  private subscriptions: Subscription[] = [];

  private currentAudio: HTMLAudioElement | null = null;
  private currentPlayingMoodId: string | null = null;

  private moodsTimeout: any;
  private usersTimeout: any;

  private setMoods(moods: Mood[]) {
    if (this.moodsTimeout) {
      clearTimeout(this.moodsTimeout);
    }
    this.moodsTimeout = setTimeout(() => {
      this.calculateMedianMood(moods, this.users);
      this.moods = moods.sort((a, b) => a.order - b.order);
      this.moodsIds = moods.map((mood) => mood._id);
    }, 150);
  }

  private setUsers(users: User[]) {
    if (this.usersTimeout) {
      clearTimeout(this.usersTimeout);
    }
    this.usersTimeout = setTimeout(() => {
      this.calculateMedianMood(this.moods, users);
      this.users = users;
    }, 150);
  }

  private calculateMedianMood(moods: Mood[], users: User[]) {
    // Si pas d'utilisateurs ou pas d'humeurs, pas de médiane
    if (users.length === 0 || moods.length === 0) {
      this.medianMood = null;
      return;
    }

    // Créer un tableau avec tous les utilisateurs qui ont une humeur
    const usersWithMood = users.filter((user) => user.mood?._id);

    // Si aucun utilisateur n'a d'humeur, pas de médiane
    if (usersWithMood.length === 0) {
      this.medianMood = null;
      return;
    }

    // Trier les utilisateurs par l'ID de leur humeur pour regrouper les mêmes humeurs
    usersWithMood.sort((a, b) =>
      (a.mood?._id || '').localeCompare(b.mood?._id || '')
    );

    // Trouver l'index médian (si nombre pair, prendre le plus petit des deux du milieu)
    const medianIndex = Math.ceil((usersWithMood.length - 1) / 2);
    const medianUserId = usersWithMood[medianIndex].mood?._id;

    // Trouver l'humeur correspondante
    this.medianMood = moods.find((mood) => mood._id === medianUserId) || null;
  }

  ngOnInit() {
    this.notificationService.init();

    const currentUserSubscription = this.authService.currentUser$.subscribe(
      (user) => {
        this.currentUser = user;
        this.isAdmin = user?.role === Role.ADMIN;
      }
    );
    this.subscriptions.push(currentUserSubscription);

    // S'abonner aux mises à jour des humeurs
    const moodsSubscription = this.moodService
      .findAllMoods()
      .subscribe((moods) => {
        this.setMoods(moods);
      });
    this.subscriptions.push(moodsSubscription);

    // S'abonner aux mises à jour des utilisateurs
    const usersSubscription = this.userService
      .findAllUsers()
      .subscribe((users) => {
        this.setUsers(users);
      });
    this.subscriptions.push(usersSubscription);
    const moodUpdatedSubscription = this.moodService
      .onMoodUpdated()
      .subscribe((mood) => {
        this.setMoods(this.moods.map((m) => (m._id === mood._id ? mood : m)));
      });
    this.subscriptions.push(moodUpdatedSubscription);
    const moodCreatedSubscription = this.moodService
      .onMoodCreated()
      .subscribe((mood) => {
        this.setMoods([...this.moods, mood]);
      });
    this.subscriptions.push(moodCreatedSubscription);
    const moodRemovedSubscription = this.moodService
      .onMoodRemoved()
      .subscribe((moodId) => {
        this.setMoods(this.moods.filter((m) => m._id !== moodId));
      });
    this.subscriptions.push(moodRemovedSubscription);

    // S'abonner aux mises à jour des utilisateurs
    const userUpdatedSubscription = this.userService
      .onUserUpdated()
      .subscribe((user) => {
        this.setUsers(this.users.map((u) => (u._id === user._id ? user : u)));
      });
    this.subscriptions.push(userUpdatedSubscription);
    const usersMoodUpdatedSubscription = this.userService
      .onUserMoodUpdated()
      .subscribe((user) => {
        // console.debug('User mood updated', user);
        this.setUsers(this.users.map((u) => (u._id === user._id ? user : u)));
      });
    this.subscriptions.push(usersMoodUpdatedSubscription);
    const userCreatedSubscription = this.userService
      .onUserCreated()
      .subscribe((user) => {
        this.setUsers([...this.users, user]);
      });
    this.subscriptions.push(userCreatedSubscription);
    const userRemovedSubscription = this.userService
      .onUserRemoved()
      .subscribe((userId) => {
        this.setUsers(this.users.filter((u) => u._id !== userId));
      });
    this.subscriptions.push(userRemovedSubscription);
  }

  ngOnDestroy() {
    this.stopSound();
    // Se désabonner de tous les observables
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  getOtherMoodsIds(moodId: string): string[] {
    return ['neutral', ...this.moodsIds.filter((id) => id !== moodId)];
  }

  // Obtenir les utilisateurs pour une humeur donnée
  getUsersByMood(moodId?: string): User[] {
    // console.debug('Refresh users for mood', moodId);
    return this.users.filter((user) => user.mood?._id === moodId);
  }

  // Gérer le drop d'un utilisateur
  onUserDrop(event: CdkDragDrop<string>) {
    const userId = event.item.data;
    const targetMoodId =
      event.container.id === 'neutral' ? null : event.container.id;

    // Vérifier si l'utilisateur a le droit de déplacer cet utilisateur
    if (this.canMoveUser(userId)) {
      // Mettre à jour immédiatement la liste des utilisateurs
      this.setUsers(
        this.users.map((user) => {
          if (user._id === userId) {
            user.mood = this.moods.find((mood) => mood._id === targetMoodId);
          }
          return user;
        })
      );

      // Appeler le service pour mettre à jour le mood de l'utilisateur
      this.userService.updateUserMood(userId, targetMoodId);
    }
  }

  // Vérifier si l'utilisateur peut déplacer un utilisateur donné
  canMoveUser(userId: string): boolean {
    return userId === this.currentUser?._id || this.isAdmin;
  }

  toggleSound(mood: Mood, event: Event) {
    event.stopPropagation(); // Empêcher la propagation de l'événement

    if (!mood.sound) return;

    // Si on clique sur le même mood qui est en cours de lecture
    if (this.currentPlayingMoodId === mood._id) {
      this.stopSound();
      return;
    }

    // Arrêter le son en cours s'il y en a un
    this.stopSound();

    // Démarrer le nouveau son
    this.currentAudio = new Audio(mood.sound);
    this.currentPlayingMoodId = mood._id;

    this.currentAudio.addEventListener('ended', () => {
      this.currentPlayingMoodId = null;
      this.currentAudio = null;
    });

    this.currentAudio.play().catch((error) => {
      console.error('Erreur lors de la lecture du son:', error);
      this.currentPlayingMoodId = null;
      this.currentAudio = null;
    });
  }

  private stopSound() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.currentPlayingMoodId = null;
    }
  }

  isPlaying(moodId: string): boolean {
    return this.currentPlayingMoodId === moodId;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
