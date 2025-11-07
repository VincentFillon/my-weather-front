import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  DailyHuntService,
  LeaderboardData,
  LeaderboardPeriod
} from '../../core/services/daily-hunt.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss'
})
export class LeaderboardComponent implements OnInit {
  private dailyHuntService = inject(DailyHuntService);
  private subscriptions: Subscription[] = [];

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  leaderboardData: LeaderboardData | null = null;
  selectedPeriod: LeaderboardPeriod = 'today';
  isLoading = false;

  periods: { value: LeaderboardPeriod; label: string }[] = [
    { value: 'today', label: 'Aujourd\'hui' },
    { value: '7days', label: '7 derniers jours' },
    { value: '2weeks', label: '2 dernières semaines' },
    { value: '30days', label: '30 derniers jours' },
    { value: '3months', label: '3 derniers mois' },
    { value: '6months', label: '6 derniers mois' },
    { value: '12months', label: '12 derniers mois' }
  ];

  ngOnInit(): void {
    this.loadLeaderboard();

    // S'abonner à l'événement newHuntFind pour mettre à jour le leaderboard en temps réel
    const newHuntFindSubscription = this.dailyHuntService.onNewHuntFind()
      .subscribe(() => {
        this.loadLeaderboard();
      });
    this.subscriptions.push(newHuntFindSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onPeriodChange(period: LeaderboardPeriod): void {
    this.selectedPeriod = period;
    this.loadLeaderboard();
  }

  private loadLeaderboard(): void {
    this.isLoading = true;
    const subscription = this.dailyHuntService.getLeaderboard(this.selectedPeriod)
      .subscribe({
        next: (data) => {
          this.leaderboardData = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du leaderboard:', error);
          this.isLoading = false;
        }
      });
    this.subscriptions.push(subscription);
  }

  onClose(): void {
    this.close.emit();
  }

  getPositionEmoji(index: number): string {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}`;
    }
  }

  formatResult(result: number | 'NA'): string {
    return result === 'NA' ? 'NA' : result.toString();
  }

  getResultClass(result: number | 'NA'): string {
    if (result === 'NA') return 'na-result';
    if (result === 1) return 'gold-result';
    if (result === 2) return 'silver-result';
    if (result === 3) return 'bronze-result';
    return 'normal-result';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  }
}
