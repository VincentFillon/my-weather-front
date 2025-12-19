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
  private canvasOffsetTop = 0;
  private canvasOffsetLeft = 0;
  private scale = 1;

  private playerNumber!: 1 | 2;
  private lastMouseY = 75;
  private lastMouseVelocity = 0;
  private lastMouseTime = 0;

  isDragging = false;
  private dragOffset = 0;
  private dragSubject = new Subject<{ y: number; velocity: number }>();

  @Input() set gameId(gameId: string) {
    this._gameId = gameId;
    this.getGame();
  }

  constructor() {
    this.dragSubject
      .pipe(
        throttleTime(1000 / 60) // Ajuster selon besoin (~16ms = 60 maj/s)
      )
      .subscribe(({ y, velocity }) => {
        this.pongService.update(
          this._gameId,
          this.playerNumber,
          { x: this.playerNumber === 1 ? 0 : fieldSize.x, y },
          velocity
        );
      });
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

    this.canvasOffsetLeft = (maxWidth - this.canvasWidth) / 2;
    this.canvasOffsetTop = (maxHeight - this.canvasHeight) / 2;
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
    this.ctx.font = 'small-caps bold 48px/1 sans-serif';

    // Dessin des raquettes
    this.ctx.fillRect(
      0,
      this.scale * (this.game.player1RacketPosition.y - (racketHeight / 2)),
      this.scale * racketWidth,
      this.scale * racketHeight
    );
    this.ctx.fillRect(
      canvas.width - this.scale * racketWidth,
      this.scale * (this.game.player2RacketPosition.y - (racketHeight / 2)),
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

      // Mesurer la largeur du texte
      const textWidth = this.ctx.measureText(text).width;

      // Calculer la position centrée
      const x = (canvas.width - textWidth) / 2;
      const y = canvas.height / 2 + 15; // +15 pour centrer verticalement

      // Dessiner le texte
      this.ctx.fillText(text, x, y);
    } else if (this.countdown != null) {
      // Mesurer la largeur du texte
      const textWidth = this.ctx.measureText(this.countdown).width;

      // Calculer la position centrée
      const x = (canvas.width - textWidth) / 2;
      const y = canvas.height / 2 + 15; // +15 pour centrer verticalement

      // Dessiner le texte
      this.ctx.fillText(this.countdown, x, y);
    } else if (this.gameStarted && this.game.isPaused) {
      const text = 'Jeu en pause';

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

  get dragZoneWidth() {
    return this.scale * racketWidth + 20;
  }

  get dragZoneHeight() {
    return this.scale * racketHeight + 20;
  }

  get dragZoneTop() {
    if (!this.game) return 0;
    const y =
      this.playerNumber === 1
        ? this.game.player1RacketPosition.y
        : this.game.player2RacketPosition.y;
    return this.scale * y - this.dragZoneHeight / 2 + this.canvasOffsetTop;
  }

  get dragZoneLeft() {
    if (this.playerNumber === 1) {
      return 0 - 10 + this.canvasOffsetLeft;
    } else {
      return this.canvasWidth - this.scale * racketWidth - 10 + this.canvasOffsetLeft;
    }
  }

  onDragStart(event: MouseEvent | TouchEvent) {
    if (!this.game || !this.gameStarted || this.game.isPaused) return;
    this.isDragging = true;
    event.preventDefault();

    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    const canvasRect = this.canvasRef.nativeElement.getBoundingClientRect();
    const relativeY = (clientY - canvasRect.top) / this.scale;
    const racketY =
      this.playerNumber === 1
        ? this.game.player1RacketPosition.y
        : this.game.player2RacketPosition.y;

    this.dragOffset = racketY - relativeY;
    this.lastMouseY = racketY;
    this.lastMouseTime = performance.now();
  }

  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onDragMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging || !this.game) return;
    event.preventDefault();

    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    const canvasRect = this.canvasRef.nativeElement.getBoundingClientRect();

    // Calcul de la nouvelle position en Y
    let newY = (clientY - canvasRect.top) / this.scale + this.dragOffset;

    // Contraintes de bornes
    newY = Math.max(
      racketHeight / 2,
      Math.min(fieldSize.y - racketHeight / 2, newY)
    );

    // Calcul de la vélocité
    const now = performance.now();
    const deltaY = Math.abs(newY - this.lastMouseY);
    const deltaT = (now - this.lastMouseTime) / 1000; // en secondes

    let velocity = 0;
    if (deltaT > 0) {
      velocity = Math.max(
        0,
        (deltaY / deltaT) * (fieldSize.y / this.canvasHeight)
      );
    }

    // Mise à jour locale immédiate
    if (this.playerNumber === 1) {
      this.game.player1RacketPosition.y = newY;
    } else {
      this.game.player2RacketPosition.y = newY;
    }

    // Envoi via le subject (throttled)
    this.dragSubject.next({ y: newY, velocity });

    this.lastMouseY = newY;
    this.lastMouseVelocity = velocity;
    this.lastMouseTime = now;
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onDragEnd() {
    this.isDragging = false;
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
