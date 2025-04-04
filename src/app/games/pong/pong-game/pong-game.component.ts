import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { Subject, Subscription, throttleTime } from 'rxjs';
import {
  ballRadius,
  fieldSize,
  Pong,
  racketHeight,
  racketWidth,
} from '../../../core/models/pong';
import { User } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth.service';
import { PongService } from '../../../core/services/pong.service';

@Component({
  selector: 'app-pong-game',
  imports: [MatButtonModule, RouterModule],
  templateUrl: './pong-game.component.html',
  styleUrl: './pong-game.component.scss',
})
export class PongGameComponent implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private pongService = inject(PongService);

  private _gameId!: string;

  private user: User | null = null;

  game?: Pong;

  gameStarted = false;
  private countdown?: string;

  displayName?: string;

  private gameSubscription?: Subscription;
  private gameJoinedSubscription?: Subscription;
  private gameStartedSubscription?: Subscription;
  private gameCountdownSubscription?: Subscription;
  private gamePlayerUpdatedSubscription?: Subscription;
  private gameUpdatedSubscription?: Subscription;
  private gamePausedSubscription?: Subscription;

  @ViewChild('gameCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  canvasWidth = fieldSize.x;
  canvasHeight = fieldSize.y;
  private scale = 1;

  private playerNumber!: 1 | 2;
  private lastMouseY = 75;
  private lastMouseVelocity = 0;
  private lastMouseTime = 0;

  private mouseMoveSubject = new Subject<MouseEvent>();

  @Input() set gameId(gameId: string) {
    this._gameId = gameId;
    this.getGame();
  }

  constructor() {
    this.mouseMoveSubject
      .pipe(
        throttleTime(1000 / 60) // Ajuster selon besoin (~16ms = 60 maj/s)
      )
      .subscribe((event) => this.processMouseMove(event));
  }

  ngOnInit() {
    this.user = this.authService.currentUser();
    this.getGame();
  }

  ngAfterViewInit() {
    this.adjustCanvasSize();
  }

  ngOnDestroy() {
    this.unsubscribeAll();
  }

  private unsubscribeAll() {
    this.gameSubscription?.unsubscribe();
    this.gameStartedSubscription?.unsubscribe();
    this.gameCountdownSubscription?.unsubscribe();
    this.gameJoinedSubscription?.unsubscribe();
    this.gamePlayerUpdatedSubscription?.unsubscribe();
    this.gameUpdatedSubscription?.unsubscribe();
    this.gamePausedSubscription?.unsubscribe();
  }

  private getGame(iteration: number = 0) {
    if (!this._gameId) return;

    if (!this.user) {
      if (iteration > 30) return;
      setTimeout(() => {
        this.getGame(iteration + 1);
      }, 100);
      return;
    }

    this.unsubscribeAll();

    // console.log('getGame', this._gameId);
    this.gameJoinedSubscription = this.pongService
      .onPongJoined()
      .subscribe((game) => {
        this.gameCountdownSubscription = this.pongService
          .onPongCountdown()
          .subscribe((countdown) => {
            this.countdown = countdown ? countdown : undefined;
          });

        this.gamePlayerUpdatedSubscription = this.pongService
          .onPongPlayerUpdated()
          .subscribe((updatedGame) => {
            if (!updatedGame || updatedGame._id !== this._gameId) return;
            this.game = updatedGame;
          });

        this.gameUpdatedSubscription = this.pongService
          .onPongUpdated()
          .subscribe((updatedGame) => {
            if (!updatedGame || updatedGame._id !== this._gameId) return;
            this.game = updatedGame;
          });

        this.gamePausedSubscription = this.pongService
          .onPongPaused()
          .subscribe((pausedGame) => {
            if (!pausedGame || pausedGame._id !== this._gameId) return;
            this.game = pausedGame;
          });

        this.gameStartedSubscription = this.pongService
          .onPongStarted()
          .subscribe((startedGame) => {
            if (!startedGame || startedGame._id !== this._gameId) return;
            this.game = startedGame;
            this.gameStarted = true;
          });

        this.playerNumber = game.player1._id === this.user!._id ? 1 : 2;
        this.game = game;
        this.gameStarted = false;
        this.initCanvas();
      });

    this.pongService.joinGame(this._gameId);
  }

  /** 🏗️ Ajuste la taille du canvas selon la taille du container */
  private adjustCanvasSize() {
    const container = this.canvasRef.nativeElement.parentElement;
    if (!container) return;

    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;

    // Calcul du facteur d'échelle unique
    this.scale = Math.floor(
      Math.min(maxWidth / fieldSize.x, maxHeight / fieldSize.y)
    );

    // Calcul des dimensions du canvas en respectant le ratio 4/3
    this.canvasWidth = this.scale * fieldSize.x;
    this.canvasHeight = this.scale * fieldSize.y;

    // Appliquer les dimensions au canvas
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
  }

  private initCanvas() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.startGameLoop();
  }

  private startGameLoop() {
    const updateFrame = () => {
      this.updateCanvas();
      requestAnimationFrame(updateFrame);
    };
    updateFrame();
  }

  private updateCanvas() {
    if (!this.ctx || !this.game) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.ctx.fillStyle = 'white';

    // Dessin des raquettes
    this.ctx.fillRect(
      0,
      this.scale * this.game.player1RacketPosition.y -
        (this.scale * racketHeight) / 2,
      this.scale * racketWidth,
      this.scale * racketHeight
    );
    this.ctx.fillRect(
      canvas.width - this.scale * racketWidth,
      this.scale * this.game.player2RacketPosition.y -
        (this.scale * racketHeight) / 2,
      this.scale * racketWidth,
      this.scale * racketHeight
    );

    if (this.game.isFinished) {
      const text = `${
        this.game.winner === 1
          ? this.game.player1.displayName
          : this.game.player2
          ? this.game.player2.displayName
          : "L'ordinateur"
      } a gagné !`;

      this.ctx.font = 'small-caps bold 48px/1 sans-serif';

      // Mesurer la largeur du texte
      const textWidth = this.ctx.measureText(text).width;

      // Calculer la position centrée
      const x = (canvas.width - textWidth) / 2;
      const y = canvas.height / 2 + 15; // +15 pour centrer verticalement

      // Dessiner le texte
      this.ctx.fillText(text, x, y);
    } else if (this.countdown != null) {
      this.ctx.font = 'small-caps bold 48px/1 sans-serif';

      // Mesurer la largeur du texte
      const textWidth = this.ctx.measureText(this.countdown).width;

      // Calculer la position centrée
      const x = (canvas.width - textWidth) / 2;
      const y = canvas.height / 2 + 15; // +15 pour centrer verticalement

      // Dessiner le texte
      this.ctx.fillText(this.countdown, x, y);
    } else if (this.gameStarted && this.game.isPaused) {
      const text = 'Jeu en pause';
      this.ctx.font = 'small-caps bold 48px/1 sans-serif';

      // Mesurer la largeur du texte
      const textWidth = this.ctx.measureText(text).width;

      // Calculer la position centrée
      const x = (canvas.width - textWidth) / 2;
      const y = canvas.height / 2 + 15; // +15 pour centrer verticalement

      // Dessiner le texte
      this.ctx.fillText(text, x, y);
    } else {
      this.ctx.beginPath();
      this.ctx.arc(
        this.scale * this.game.ballPosition.x,
        this.scale * this.game.ballPosition.y,
        this.scale * ballRadius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouseMoveSubject.next(event);
  }

  processMouseMove(event: MouseEvent) {
    if (!this.game) return;
    const newMouseTime = performance.now();

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Récupérer la position du curseur (en limitant au rectangle du canvas)
    const halfRacket = (this.scale * racketHeight) / 2;
    let newY = 0;
    if (event.clientY <= rect.top) {
      newY = rect.top + halfRacket;
    } else if (event.clientY >= rect.bottom) {
      newY = rect.bottom - halfRacket;
    } else {
      newY = event.clientY - rect.top;
    }

    // Position de la raquête sur le plateau (mis à l'échelle)
    newY /= this.scale;

    // Calcul de la vélocité
    const deltaY = Math.abs(newY - this.lastMouseY);
    const deltaT = (newMouseTime - this.lastMouseTime) / 1000; // en secondes

    let velocity = 0;
    if (deltaT > 0) {
      velocity = Math.max(
        0,
        (deltaY / deltaT) * (fieldSize.y / this.canvasHeight)
      );
    }

    console.log(
      `[${newMouseTime}]${
        this.game.isPaused ? ' (PAUSE)' : ''
      } Raquette : {x: ${
        this.playerNumber === 1 ? 0 : fieldSize.x
      }, y: ${newY}} Vitesse : ${velocity}`
    );

    // Envoyer la mise à jour seulement si la raquette bouge ou si la vélocité change
    if (
      (deltaY !== 0 || velocity !== this.lastMouseVelocity) &&
      !this.game.isPaused &&
      this.gameStarted
    ) {
      this.pongService.update(
        this._gameId,
        this.playerNumber,
        { x: this.playerNumber === 1 ? 0 : fieldSize.x, y: newY },
        velocity
      );
    }

    // Mise à jour des valeurs précédentes
    this.lastMouseY = newY;
    this.lastMouseVelocity = velocity;
    this.lastMouseTime = newMouseTime;
  }

  @HostListener('document:keydown.space', ['$event'])
  togglePause(event: KeyboardEvent) {
    event.preventDefault();
    this.pauseGame();
  }

  pauseGame() {
    if (!this.game) return;
    if (this.game.isPaused) {
      this.startCountdown();
    } else {
      this.pongService.pauseGame(this._gameId);
    }
  }

  startGame() {
    this.startCountdown();
  }

  private startCountdown() {
    if (!this.game) return;
    this.countdown = 'Démarrage de la partie...';
    this.game.isPaused = false;
    this.pongService.startGame(this._gameId);
  }
}
