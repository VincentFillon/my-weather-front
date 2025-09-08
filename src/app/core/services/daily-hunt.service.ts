import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketService } from './socket.service';

export interface DailyHunt {
  _id: string;
  date: string;
  positionX: number;
  positionY: number;
}

export interface DailyHuntFindResult {
  message: 'Success' | 'Already found';
  rank: number;
}

export interface DailyHuntNewFind {
  user: {
    _id: string;
    displayName: string;
    image?: string;
  };
  rank: number;
}

export interface TodaysHuntPayload {
  hunt: {
    _id: string;
    date: string;
    positionX: number;
    positionY: number;
  } | null;
  finds: DailyHuntNewFind[];
  alreadyFound: boolean;
}

export interface LeaderboardEntry {
  user: {
    _id: string;
    displayName: string;
    image?: string;
  };
  totalPoints: number;
  lastFiveResults: (number | 'NA')[];
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  lastFiveDays: string[];
}

export type LeaderboardPeriod = 'today' | '7days' | '2weeks' | '30days' | '3months' | '6months' | '12months';

@Injectable({
  providedIn: 'root',
})
export class DailyHuntService {
  private socketService = inject(SocketService);

  private todaysHunt$: Observable<DailyHunt> | undefined;
  private todaysHuntFull$: Observable<TodaysHuntPayload> | undefined;
  private huntResult$: Observable<DailyHuntFindResult> | undefined;
  private newHuntFind$: Observable<DailyHuntNewFind> | undefined;
  private leaderboard$: Observable<LeaderboardData> | undefined;

  // API existante: ne renvoie que l'objet DailyHunt (compat backward)
  getTodaysHunt(): Observable<DailyHunt> {
    if (!this.todaysHunt$) {
      this.todaysHunt$ = this.socketService.fromEvent<DailyHunt>('todaysHunt');
    }
    this.socketService.emit('getTodaysHunt', {});
    return this.todaysHunt$;
  }

  // Nouvelle API: renvoie la position + liste des gagnants + alreadyFound
  getTodaysHuntFull(): Observable<TodaysHuntPayload> {
    if (!this.todaysHuntFull$) {
      this.todaysHuntFull$ =
        this.socketService.fromEvent<TodaysHuntPayload>('todaysHuntFull');
    }
    this.socketService.emit('getTodaysHunt', { full: true });
    return this.todaysHuntFull$;
  }

  foundHunt(): void {
    this.socketService.emit('foundHunt', {});
  }

  onHuntResult(): Observable<DailyHuntFindResult> {
    if (!this.huntResult$) {
      this.huntResult$ =
        this.socketService.fromEvent<DailyHuntFindResult>('huntResult');
    }
    return this.huntResult$;
  }

  onNewHuntFind(): Observable<DailyHuntNewFind> {
    if (!this.newHuntFind$) {
      this.newHuntFind$ =
        this.socketService.fromEvent<DailyHuntNewFind>('newHuntFind');
    }
    return this.newHuntFind$;
  }

  getLeaderboard(period: LeaderboardPeriod = 'today'): Observable<LeaderboardData> {
    if (!this.leaderboard$) {
      this.leaderboard$ = this.socketService.fromEvent<LeaderboardData>('leaderboard');
    }
    this.socketService.emit('getLeaderboard', { period });
    return this.leaderboard$;
  }
}
