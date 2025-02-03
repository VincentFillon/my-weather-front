import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { TicTacToe } from '../core/models/tic-tac-toe';
import { User } from '../core/models/user';
import { AuthService } from '../core/services/auth.service';
import { TicTacToeService } from '../core/services/tic-tac-toe.service';

interface LeaderboardEntry {
  _id: string;
  name: string;
  wins: number;
  draws: number;
  losses: number;
  recentGames: string;
}

@Component({
  standalone: true,
  selector: 'app-games',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './games.component.html',
  styleUrl: './games.component.scss',
})
export class GamesComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private ticTacToeService = inject(TicTacToeService);
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

  games: TicTacToe[] = [];
  selectedGame: TicTacToe | null = null;
  gameSubscription?: Subscription;

  ngOnInit() {
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      if (user) {
        this.leaderboardSubscription?.unsubscribe();
        this.gamesSubscription?.unsubscribe();

        this.leaderboardSubscription = this.ticTacToeService
          .onLeaderboardUpdated()
          .subscribe((leaderboard) => {
            const leaderboardEntries: LeaderboardEntry[] = [];
            for (const player of leaderboard) {
              const entry: LeaderboardEntry = {
                _id: player.player._id,
                name: player.player.username,
                wins: player.wins.nb,
                draws: player.draws.nb,
                losses: player.losses.nb,
                recentGames: [
                  ...player.wins.games,
                  ...player.draws.games,
                  ...player.losses.games,
                ]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt!).getTime() -
                      new Date(a.createdAt!).getTime()
                  )
                  .slice(0, 5)
                  .map((game) => {
                    switch (game.winner) {
                      case 'O':
                        return game.playerO &&
                          game.playerO._id === player.player._id
                          ? 'V'
                          : 'D';
                      case 'X':
                        return game.playerX._id === player.player._id
                          ? 'V'
                          : 'D';
                      default:
                        return 'N';
                    }
                  })
                  .join(', '),
              };
              leaderboardEntries.push(entry);
            }
            this.leaderboard = leaderboardEntries;
          });
        this.gamesSubscription = this.ticTacToeService
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

  getGameDisplayName(game: TicTacToe): string {
    if (game.playerX._id === this.user?._id) {
      return game.playerO?.username || 'Ordinateur';
    } else if (game.playerO && game.playerO._id === this.user?._id) {
      return game.playerX?.username || 'Ordinateur';
    }
    return 'Inconnu';
  }

  selectGame(game: TicTacToe) {
    this.selectedGame = game;
    this.router.navigate([`/games/${game._id}`]);
  }

  closeSelectedGame() {
    console.debug('closeSelectedGame');
    this.selectedGame = null;
    this.router.navigate(['/games']);
  }
}
