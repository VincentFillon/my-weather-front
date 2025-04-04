import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Pong } from '../../core/models/pong';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { PongService } from '../../core/services/pong.service';

interface LeaderboardEntry {
  _id: string;
  name: string;
  wins: number;
  losses: number;
  recentGames: string;
}

@Component({
  selector: 'app-pong',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './pong.component.html',
  styleUrl: './pong.component.scss',
})
export class PongComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private pongService = inject(PongService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private routeSubscription?: Subscription;
  private userSubscription?: Subscription;
  private leaderboardSubscription?: Subscription;
  private gamesSubscription?: Subscription;
  private gameCreatedSubscription?: Subscription;
  private gameUpdatedSubscription?: Subscription;
  private gameRemovedSubscription?: Subscription;

  private user: User | null = null;

  leaderboard: LeaderboardEntry[] = [];

  games: Pong[] = [];
  selectedGame: Pong | null = null;
  gameSubscription?: Subscription;

  ngOnInit() {
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      if (user) {
        this.leaderboardSubscription?.unsubscribe();
        this.gamesSubscription?.unsubscribe();

        this.leaderboardSubscription = this.pongService
          .onLeaderboardUpdated()
          .subscribe((leaderboard) => {
            const leaderboardEntries: LeaderboardEntry[] = [];
            for (const player of leaderboard) {
              const entry: LeaderboardEntry = {
                _id: player.player._id,
                name: player.player.displayName,
                wins: player.wins.nb,
                losses: player.losses.nb,
                recentGames: [...player.wins.games, ...player.losses.games]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt!).getTime() -
                      new Date(a.createdAt!).getTime()
                  )
                  .slice(0, 5)
                  .map((game) => {
                    return game.winner === 1 &&
                      game.player1._id === player.player._id
                      ? 'V'
                      : 'D';
                  })
                  .join(', '),
              };
              leaderboardEntries.push(entry);
            }
            this.leaderboard = leaderboardEntries;
          });
        this.gamesSubscription = this.pongService
          .findByUser(user._id, false)
          .subscribe((games) => {
            this.games = games;
            if (this.selectedGame && !this.games.includes(this.selectedGame)) {
              this.closeSelectedGame();
            } else if (
              !this.selectedGame &&
              this.route.snapshot.paramMap.has('gameId')
            ) {
              const selectedGame = this.games.find(
                (g) => g._id === this.route.snapshot.paramMap.get('gameId')!
              );
              if (selectedGame) this.selectGame(selectedGame);
              else this.closeSelectedGame();
            }
          });
      } else {
        this.leaderboard = [];
        this.games = [];
        this.closeSelectedGame();
      }
    });
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
    this.leaderboardSubscription?.unsubscribe();
    this.gamesSubscription?.unsubscribe();
    this.gameCreatedSubscription?.unsubscribe();
    this.gameSubscription?.unsubscribe();
    this.gameUpdatedSubscription?.unsubscribe();
    this.gameRemovedSubscription?.unsubscribe();
  }

  getGameDisplayName(game: Pong): string {
    if (game.player1._id === this.user?._id) {
      return game.player2?.displayName || 'Ordinateur';
    } else if (game.player2 && game.player2._id === this.user?._id) {
      return game.player1?.displayName || 'Ordinateur';
    }
    return 'Inconnu';
  }

  selectGame(game: Pong) {
    this.selectedGame = game;
    this.router.navigate([`/games/pong/${game._id}`]);
  }

  closeSelectedGame() {
    console.debug('closeSelectedGame');
    this.selectedGame = null;
    this.router.navigate(['/games/pong']);
  }
}
