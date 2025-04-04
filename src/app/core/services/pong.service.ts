import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreatePongDto, Pong, Position } from '../models/pong';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class PongService {
  private socketService = inject(SocketService);

  private leaderboard$?: Observable<any[]>; // TODO
  private pongFound$?: Observable<Pong>;
  private pongsFound$?: Observable<Pong[]>;
  private pongCreated$?: Observable<Pong>;
  private pongJoined$?: Observable<Pong>;
  private pongPaused$?: Observable<Pong>;
  private pongStarted$?: Observable<Pong>;
  private pongCountdown$?: Observable<string>;
  private pongPlayerUpdated$?: Observable<Pong>;
  private pongUpdated$?: Observable<Pong>;
  private pongRemoved$?: Observable<Pong>;

  public create(createPongDto: CreatePongDto) {
    this.socketService.emit('createPong', createPongDto);
  }

  public joinGame(gameId: string) {
    this.socketService.emit('joinPong', gameId);
  }

  public findAll(): Observable<Pong[]> {
    if (!this.pongsFound$) {
      this.pongsFound$ = this.socketService.fromEvent<Pong[]>('pongsFound');
    }
    this.socketService.emit('findAllPong', {});
    return this.pongsFound$;
  }

  public findByUser(userId: string, isFinished?: boolean): Observable<Pong[]> {
    if (!this.pongsFound$) {
      this.pongsFound$ = this.socketService.fromEvent<Pong[]>('pongsFound');
    }
    this.socketService.emit('findPongByUser', { userId, isFinished });
    return this.pongsFound$;
  }

  public findOne(_id: string): Observable<Pong> {
    if (!this.pongFound$) {
      this.pongFound$ = this.socketService.fromEvent<Pong>('pongFound');
    }
    this.socketService.emit('findOnePong', { _id });
    return this.pongFound$;
  }

  public startGame(gameId: string) {
    this.socketService.emit('startPong', gameId);
  }

  public update(gameId: string, player: 1 | 2, playerRacketPosition: Position, playerRacketVelocity: number): void {
    console.debug('updatePong : ', { _id: gameId, player, playerRacketPosition, playerRacketVelocity });
    this.socketService.emit('updatePong', { _id: gameId, player, playerRacketPosition, playerRacketVelocity });
  }

  public pauseGame(gameId: string) {
    this.socketService.emit('pausePong', gameId);
  }

  public remove(_id: string): void {
    this.socketService.emit('removePong', { _id });
  }

  public onLeaderboardUpdated(): Observable<any[]> {
    if (!this.leaderboard$) {
      this.leaderboard$ = this.socketService.fromEvent<any[]>(
        'pongLeaderboardUpdated'
      );
    }
    this.socketService.emit('pongLeaderboard', {});
    return this.leaderboard$;
  }

  public onPongCreated(): Observable<Pong> {
    if (!this.pongCreated$) {
      this.pongCreated$ = this.socketService.fromEvent<Pong>('pongCreated');
    }
    return this.pongCreated$;
  }

  public onPongJoined(): Observable<Pong> {
    if (!this.pongJoined$) {
      this.pongJoined$ = this.socketService.fromEvent<Pong>('pongJoined');
    }
    return this.pongJoined$;
  }

  public onPongStarted(): Observable<Pong> {
    if (!this.pongStarted$) {
      this.pongStarted$ = this.socketService.fromEvent<Pong>('pongStarted');
    }
    return this.pongStarted$;
  }

  public onPongCountdown(): Observable<string> {
    if (!this.pongCountdown$) {
      this.pongCountdown$ = this.socketService.fromEvent<string>('pongCountdown');
    }
    return this.pongCountdown$;
  }

  public onPongPaused(): Observable<Pong> {
    if (!this.pongPaused$) {
      this.pongPaused$ = this.socketService.fromEvent<Pong>('pongPaused');
    }
    return this.pongPaused$;
  }

  public onPongPlayerUpdated(): Observable<Pong> {
    if (!this.pongPlayerUpdated$) {
      this.pongPlayerUpdated$ = this.socketService.fromEvent<Pong>('pongPlayerUpdated');
    }
    return this.pongPlayerUpdated$;
  }

  public onPongUpdated(): Observable<Pong> {
    if (!this.pongUpdated$) {
      this.pongUpdated$ = this.socketService.fromEvent<Pong>('pongUpdated');
    }
    return this.pongUpdated$;
  }

  public onPongRemoved(): Observable<Pong> {
    if (!this.pongRemoved$) {
      this.pongRemoved$ = this.socketService.fromEvent<Pong>('pongRemoved');
    }
    return this.pongRemoved$;
  }
}
