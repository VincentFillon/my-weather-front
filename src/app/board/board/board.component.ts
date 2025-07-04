import { Component, LOCALE_ID, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { DatePipe, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; // Ajout de l'import
import { MatTooltipModule } from '@angular/material/tooltip';
import { Chart, registerables } from 'chart.js';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { Subscription } from 'rxjs';
import { Mood } from '../../core/models/mood';
import { MoodChartData } from '../../core/models/mood-chart-data';
import { PublicHoliday } from '../../core/models/public-holiday';
import { Role } from '../../core/models/role.enum';
import { User } from '../../core/models/user';
import { WorldDay } from '../../core/models/world-day';
import { AuthService } from '../../core/services/auth.service';
import { MoodChartService } from '../../core/services/mood-chart.service';
import { MoodService } from '../../core/services/mood.service';
import { PublicHolidaysService } from '../../core/services/public-holidays.service';
import { ThemeService } from '../../core/services/theme.service'; // Ajout de l'import
import { UserService } from '../../core/services/user.service';
import { WorldDaysService } from '../../core/services/world-days.service';
import { Interruption, TimerComponent } from '../timer/timer.component';
import { WeatherWidgetComponent } from '../weather-widget/weather-widget.component';

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
    NgClass,
    RouterModule,
    DatePipe,
    TimerComponent,
    MatTooltipModule,
    MatSlideToggleModule, // Ajout du module
    WeatherWidgetComponent,
    NgScrollbarModule,
  ],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  animations: [
    trigger('fadeOutShrink', [
      state('void', style({ opacity: 0, transform: 'scale(0.9)' })),
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('1s ease-in', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('1s ease-in', style({ opacity: 0, transform: 'scale(0.9)' })),
      ]),
    ]),
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }],
})
export class BoardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private moodService = inject(MoodService);
  private userService = inject(UserService);
  private worldDaysService = inject(WorldDaysService);
  private publicHolidaysService = inject(PublicHolidaysService);
  private moodChartService = inject(MoodChartService); // Injection du service MoodChart
  public themeService = inject(ThemeService); // Injection et public pour le template

  currentUser: User | null = null;
  isAdmin = false;

  today = new Date();
  todayWorldDay: WorldDay | undefined;
  startOfDay: Date;
  endOfDay: Date;
  workdayInterruptions: Interruption[] = [
    {
      from: {
        day: '1-5', // Du lundi au vendredi
        hour: 0,
        minute: 0,
        second: 0,
      },
      to: {
        day: '1-5', // Du lundi au vendredi
        hour: 8,
        minute: 30,
        second: 0,
      },
      label: "la journée n'a pas commencé 😴",
    },
    {
      from: {
        day: '1-5', // Du lundi au vendredi
        hour: 12,
        minute: 30,
        second: 0,
      },
      to: {
        day: '1-5', // Du lundi au vendredi
        hour: 14,
        minute: 0,
        second: 0,
      },
      label: "c'est l'heure de la pause 🌭",
    },
    {
      from: {
        day: '1-4', // Du lundi au jeudi
        hour: 18,
        minute: 0,
        second: 0,
      },
      to: {
        day: '1-4', // Du lundi au jeudi
        hour: 23,
        minute: 59,
        second: 59,
      },
      label: 'la journée est terminée 🎉',
    },
    {
      from: {
        day: 5, // Vendredi
        hour: 17,
        minute: 0,
        second: 0,
      },
      to: {
        day: 0, // Dimanche
        hour: 23,
        minute: 59,
        second: 59,
      },
      label: "c'est le weekend ! 🥳🍾🍻",
    },
  ];

  nextPublicHoliday: PublicHoliday | null = null;

  gtaVIReleaseDateAnnouncement = new Date('2025-05-02T00:00:00Z');
  gtaVIReleaseDate = new Date('2026-05-26T00:00:00Z');

  moods: Mood[] = [];
  moodsIds: string[] = [];
  medianMood: Mood | null = null;
  backgroundImgUrl: string = ''; // Nouvelle propriété pour l'URL de l'image de fond

  private moodChart: Chart | undefined;
  private moodChartData: MoodChartData | undefined;

  users: User[] = [];

  focusedUser: User | null = null;
  focusedUserTimeout?: NodeJS.Timeout;

  private subscriptions: Subscription[] = [];

  private currentAudio: HTMLAudioElement | null = null;
  private currentPlayingMoodId: string | null = null;

  private moodsTimeout: any;
  private usersTimeout: any;

  constructor() {
    this.startOfDay = new Date(this.today);
    this.startOfDay.setHours(8, 30, 0, 0);
    this.endOfDay = new Date(this.today);
    if (this.today.getDay() === 5) {
      this.endOfDay.setHours(17, 0, 0, 0);
    } else {
      this.endOfDay.setHours(18, 0, 0, 0);
    }
  }

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

    // Créer une carte des humeurs pour un accès rapide à l'ordre
    const moodsMap = new Map<string, Mood>(
      moods.map((mood) => [mood._id, mood])
    );

    // Trier les utilisateurs par l'ordre de leur humeur
    usersWithMood.sort((a, b) => {
      const orderA = moodsMap.get(a.mood?._id || '')?.order || 0;
      const orderB = moodsMap.get(b.mood?._id || '')?.order || 0;
      return orderA - orderB;
    });

    // Trouver l'index médian
    // la médiane est volontairement pessimiste et va récupérer l'élément supérieur en cas de nombre impair
    // pour une médiane "optimiste", il faudrait utiliser Math.floor
    const medianIndex = Math.ceil((usersWithMood.length - 1) / 2);
    const medianUserId = usersWithMood[medianIndex].mood?._id;

    // Trouver l'humeur correspondante
    this.medianMood = moods.find((mood) => mood._id === medianUserId) || null;
    if (this.medianMood?.backgroundImg) {
      this.backgroundImgUrl = this.medianMood.backgroundImg;
    } else {
      this.backgroundImgUrl = ''; // Ou une image par défaut
    }
  }

  ngOnInit() {
    Chart.register(...registerables); // Enregistrer tous les composants de Chart.js

    const currentUserSubscription = this.authService.currentUser$.subscribe(
      (user) => {
        this.currentUser = user;
        this.isAdmin = user?.role === Role.ADMIN;
      }
    );
    this.subscriptions.push(currentUserSubscription);

    // Récupérer la journée mondiale actuelle
    const worldDaySubscription = this.worldDaysService
      .getToday()
      .subscribe((wordlDay) => {
        this.todayWorldDay = wordlDay;
      });
    this.subscriptions.push(worldDaySubscription);

    // Récupérer le prochain jour férié
    const nextPublicHolidaySubscription = this.publicHolidaysService
      .findNext()
      .subscribe((publicHoliday) => {
        this.nextPublicHoliday = publicHoliday;
      });
    this.subscriptions.push(nextPublicHolidaySubscription);

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

    // Récupérer les données du graphique d'humeur
    const moodChartSubscription = this.moodChartService
      .getMoodChartData()
      .subscribe((data) => {
        this.moodChartData = data;
        this.renderMoodChart();
      });
    this.subscriptions.push(moodChartSubscription);
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
    return this.users
      .filter((user) => user.mood?._id === moodId)
      .sort((a, b) => {
        const dateA = a.moodUpdatedAt ? new Date(a.moodUpdatedAt).getTime() : 0;
        const dateB = b.moodUpdatedAt ? new Date(b.moodUpdatedAt).getTime() : 0;
        return dateA - dateB;
      });
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

  toggleUserFocus(user: User, focused: boolean) {
    clearTimeout(this.focusedUserTimeout);
    if (focused) {
      this.focusedUser = user;
    } else {
      this.focusedUserTimeout = setTimeout(() => {
        this.focusedUser = null;
      }, 2000);
    }
  }

  hexToRgb(hex: string, alpha: number = 1): string | null {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `rgba(${parseInt(result[1], 16)}, ${parseInt(
          result[2],
          16
        )}, ${parseInt(result[3], 16)}, ${alpha})`
      : null;
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
    // console.debug('[BoardComponent] logout');
    this.authService.logout();
  }
  private renderMoodChart() {
    if (this.moodChart) {
      this.moodChart.destroy(); // Détruire l'ancien graphique si il existe
    }

    const canvas = document.getElementById('moodChartCanvas') as HTMLCanvasElement;
    if (canvas && this.moodChartData) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        this.moodChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: this.moodChartData.labels,
            datasets: [
              {
                label: 'Évolution de l\'humeur',
                data: this.moodChartData.data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)', // Lignes de grille plus transparentes
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.7)', // Couleur des labels de l'axe Y
                },
              },
              x: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)', // Lignes de grille plus transparentes
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.7)', // Couleur des labels de l'axe X
                },
              },
            },
            plugins: {
              legend: {
                labels: {
                  color: 'rgba(255, 255, 255, 0.9)', // Couleur du texte de la légende
                },
              },
            },
          },
        });
      }
    }
  }
}
