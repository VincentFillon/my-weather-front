import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateTicTacToeDto,
  TicTacToe,
  TicTacToePlayer,
} from '../models/tic-tac-toe';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class TicTacToeService {
  private socketService = inject(SocketService);

  private leaderboard$?: Observable<TicTacToePlayer[]>;
  private ticTacToeFound$?: Observable<TicTacToe>;
  private ticTacToesFound$?: Observable<TicTacToe[]>;
  private ticTacToeCreated$?: Observable<TicTacToe>;
  private ticTacToeUpdated$?: Observable<TicTacToe>;
  private ticTacToeRemoved$?: Observable<TicTacToe>;

  public create(createTicTacToeDto: CreateTicTacToeDto) {
    this.socketService.emit('createTicTacToe', createTicTacToeDto);
  }

  public findAll(): Observable<TicTacToe[]> {
    if (!this.ticTacToesFound$) {
      this.ticTacToesFound$ =
        this.socketService.fromEvent<TicTacToe[]>('ticTacToesFound');
    }
    this.socketService.emit('findAllTicTacToe', {});
    return this.ticTacToesFound$;
  }

  public findByUser(
    userId: string,
    isFinished?: boolean
  ): Observable<TicTacToe[]> {
    if (!this.ticTacToesFound$) {
      this.ticTacToesFound$ =
        this.socketService.fromEvent<TicTacToe[]>('ticTacToesFound');
    }
    this.socketService.emit('findTicTacToeByUser', { userId, isFinished });
    return this.ticTacToesFound$;
  }

  public findOne(_id: string): Observable<TicTacToe> {
    if (!this.ticTacToeFound$) {
      this.ticTacToeFound$ =
        this.socketService.fromEvent<TicTacToe>('ticTacToeFound');
    }
    this.socketService.emit('findOneTicTacToe', { _id });
    return this.ticTacToeFound$;
  }

  public update(_id: string, player: 'X' | 'O', index: number): void {
    this.socketService.emit('updateTicTacToe', { _id, player, index });
  }

  public remove(_id: string): void {
    this.socketService.emit('removeTicTacToe', { _id });
  }

  public onLeaderboardUpdated(): Observable<TicTacToePlayer[]> {
    if (!this.leaderboard$) {
      this.leaderboard$ = this.socketService.fromEvent<TicTacToePlayer[]>(
        'ticTacToeLeaderboardUpdated'
      );
    }
    this.socketService.emit('ticTacToeLeaderboard', {});
    return this.leaderboard$;
  }

  public onTicTacToeCreated(): Observable<TicTacToe> {
    if (!this.ticTacToeCreated$) {
      this.ticTacToeCreated$ =
        this.socketService.fromEvent<TicTacToe>('ticTacToeCreated');
    }
    return this.ticTacToeCreated$;
  }

  public onTicTacToeUpdated(): Observable<TicTacToe> {
    if (!this.ticTacToeUpdated$) {
      this.ticTacToeUpdated$ =
        this.socketService.fromEvent<TicTacToe>('ticTacToeUpdated');
    }
    return this.ticTacToeUpdated$;
  }

  public onTicTacToeRemoved(): Observable<TicTacToe> {
    if (!this.ticTacToeRemoved$) {
      this.ticTacToeRemoved$ =
        this.socketService.fromEvent<TicTacToe>('ticTacToeRemoved');
    }
    return this.ticTacToeRemoved$;
  }
}
