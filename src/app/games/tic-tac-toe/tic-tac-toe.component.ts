import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { TicTacToe } from '../../core/models/tic-tac-toe';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { TicTacToeService } from '../../core/services/tic-tac-toe.service';

@Component({
  standalone: true,
  selector: 'app-tic-tac-toe',
  imports: [MatButtonModule, RouterModule],
  templateUrl: './tic-tac-toe.component.html',
  styleUrl: './tic-tac-toe.component.scss',
})
export class TicTacToeComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private ticTacToeService = inject(TicTacToeService);

  private _gameId!: string;

  private user: User | null = null;

  game?: TicTacToe;
  gameStatus: 'playing' | 'won' | 'lost' | 'draw' = 'playing';

  currentPlayer: 'X' | 'O' = 'X';
  isMyTurn = false;

  private gameSubscription?: Subscription;
  private gameJoinedSubscription?: Subscription;
  private gameUpdatedSubscription?: Subscription;

  @Input() set gameId(gameId: string) {
    this._gameId = gameId;
    this.getGame();
  }

  ngOnInit() {
    this.user = this.authService.currentUser();
  }

  ngOnDestroy() {
    this.gameSubscription?.unsubscribe();
    this.gameJoinedSubscription?.unsubscribe();
    this.gameUpdatedSubscription?.unsubscribe();
  }

  private getGame() {
    if (!this._gameId) return;
    console.log('getGame', this._gameId);
    this.gameJoinedSubscription = this.ticTacToeService
      .onTicTacToeJoined()
      .subscribe((game) => {
        this.gameUpdatedSubscription = this.ticTacToeService
          .onTicTacToeUpdated()
          .subscribe((updatedGame) => {
            if (updatedGame._id !== this.game?._id) return;
            this.game = updatedGame;
            this.setTurn();
            this.checkGameStatus();
          });
        this.game = game;
        this.setTurn();
        this.checkGameStatus();
      });
    this.ticTacToeService.joinGame(this._gameId);
  }

  private setTurn() {
    if (this.game) {
      if (this.game.turn % 2 === 0) {
        this.currentPlayer = 'O';
      } else {
        this.currentPlayer = 'X';
      }
      this.isMyTurn =
        (this.currentPlayer === 'X' &&
          this.game.playerX._id === this.user?._id) ||
        (this.currentPlayer === 'O' &&
          this.game.playerO?._id === this.user?._id) ||
        !this.game.playerO;
    }
  }

  onCellClick(index: number) {
    console.log('onCellClick', index);
    if (this.isMyTurn && this.game && !this.game.grid[index]) {
      this.ticTacToeService.update(this.game._id, this.currentPlayer, index);
    }
  }

  private checkGameStatus() {
    if (this.game?.winner != null) {
      const player = this.game.playerX._id === this.user?._id ? 'X' : 'O';
      switch (this.game.winner) {
        case 'X':
          this.gameStatus = this.game.winner === player ? 'won' : 'lost';
          break;
        case 'O':
          this.gameStatus = this.game.winner === player ? 'won' : 'lost';
          break;
        default:
          this.gameStatus = 'draw';
          break;
      }
    } else {
      this.gameStatus = 'playing';
    }
  }
}
