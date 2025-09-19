import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  DailyHunt,
  DailyHuntService,
} from '../../core/services/daily-hunt.service';

@Component({
  selector: 'app-daily-hunt',
  standalone: true,
  imports: [],
  templateUrl: './daily-hunt.component.html',
  styleUrl: './daily-hunt.component.scss',
})
export class DailyHuntComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewInit
{
  private dailyHuntService = inject(DailyHuntService);
  private subscriptions: Subscription[] = [];

  private svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(0.000000,1080.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
    <path d="M3760 9314 c-146 -31 -228 -95 -337 -261 -98 -149 -155 -328 -223 -695 -41 -224 -145 -874 -164 -1023 -50 -392 -53 -701 -13 -1160 30 -347 51 -666 71 -1049 12 -250 14 -260 36 -278 28 -23 32 -22 61 1 24 19 24 22 22 190 -2 260 -20 476 -94 1161 -40 362 -35 797 12 1159 45 347 160 989 219 1221 60 238 115 364 209 483 48 60 72 81 123 106 95 47 267 66 359 41 47 -13 248 -133 344 -205 108 -82 227 -220 275 -319 45 -93 120 -315 145 -429 21 -95 45 -378 33 -392 -6 -6 -108 -9 -276 -8 -382 3 -634 25 -822 70 -118 28 -165 50 -296 134 -97 63 -136 73 -154 39 -18 -33 -3 -56 69 -110 226 -167 526 -220 1237 -222 l261 0 27 -191 c51 -380 66 -717 66 -1568 0 -317 5 -657 10 -755 14 -244 57 -670 70 -693 5 -11 10 -22 10 -24 0 -2 -44 -7 -98 -10 -103 -7 -272 -45 -350 -78 -98 -42 -218 -145 -277 -239 -36 -57 -79 -168 -105 -270 -31 -122 -53 -143 -65 -63 -28 198 -181 471 -356 639 -77 73 -216 177 -279 208 -143 72 -455 133 -509 99 -18 -11 -22 -21 -19 -44 4 -28 3 -29 -34 -29 -21 0 -91 -11 -155 -25 -65 -14 -125 -25 -134 -25 -10 0 -23 17 -33 45 -13 33 -25 47 -43 51 -45 12 -58 -6 -58 -76 l0 -62 -61 -27 c-63 -29 -153 -86 -291 -184 -191 -134 -284 -242 -323 -373 l-13 -42 -131 -47 c-72 -26 -246 -89 -386 -141 -140 -52 -300 -110 -355 -131 -289 -105 -460 -178 -497 -211 -23 -20 -23 -59 0 -71 33 -18 126 13 497 167 365 150 820 322 855 322 4 0 10 -57 12 -127 4 -123 5 -131 40 -203 20 -41 46 -91 58 -111 l22 -36 -64 -164 c-120 -304 -136 -360 -112 -396 22 -34 60 -30 84 9 11 18 52 114 91 213 39 99 75 188 81 198 8 15 19 8 92 -59 108 -99 224 -185 307 -229 75 -39 263 -110 359 -135 l65 -17 5 -120 c6 -132 21 -173 64 -173 43 0 51 23 38 101 -16 93 -16 169 1 169 6 0 55 -7 107 -15 52 -8 182 -18 288 -21 l193 -7 34 -71 c18 -39 50 -127 70 -196 52 -176 63 -199 93 -207 33 -8 56 8 60 41 4 30 -85 290 -130 380 -16 32 -28 59 -26 61 2 2 34 11 71 19 110 26 211 72 250 115 84 93 177 307 177 407 0 55 11 49 29 -16 20 -70 65 -151 109 -196 70 -72 331 -248 431 -290 78 -34 189 -72 256 -88 l70 -17 18 -112 c38 -233 115 -537 144 -569 21 -24 49 -23 66 2 19 27 9 88 -43 260 -37 122 -80 329 -80 383 0 22 2 22 187 22 140 1 205 5 253 17 69 18 80 14 80 -28 0 -29 75 -478 99 -596 11 -53 27 -113 35 -132 18 -43 50 -55 78 -29 18 16 20 26 15 93 -5 58 -82 569 -111 731 -4 23 1 28 62 54 188 79 343 177 433 271 162 171 219 307 219 520 0 101 -7 98 141 49 224 -76 329 -93 349 -55 27 50 -9 68 -300 150 -102 28 -187 53 -188 55 -2 2 -18 68 -36 147 -46 200 -59 241 -110 342 -25 50 -44 91 -43 93 2 1 52 21 113 44 151 57 432 178 600 259 155 74 175 94 136 133 -19 19 -24 19 -64 8 -24 -7 -144 -62 -269 -121 -180 -86 -549 -240 -575 -240 -3 0 -16 13 -30 29 -31 38 -162 122 -241 155 -89 37 -179 50 -353 49 -171 -1 -316 -25 -425 -68 -32 -14 -60 -23 -61 -22 -6 10 -36 197 -48 302 -37 328 -40 407 -41 1245 -2 952 -5 1020 -70 1439 -14 85 -23 157 -20 159 2 3 39 8 82 12 166 17 245 32 264 51 24 24 24 34 0 58 -21 21 -44 21 -181 -4 -41 -8 -98 -17 -126 -20 l-51 -6 -6 143 c-4 81 -16 181 -27 232 -44 196 -166 498 -244 604 -45 62 -207 221 -276 272 -83 62 -248 161 -310 187 -46 19 -73 22 -160 22 -58 0 -134 -7 -170 -15z m-567 -4679 c109 -16 180 -43 196 -73 6 -11 14 -45 17 -77 5 -43 12 -60 29 -71 29 -19 70 -4 78 28 11 40 8 107 -8 144 l-14 35 30 -18 c60 -35 218 -172 270 -235 137 -165 210 -313 250 -514 l21 -105 -91 -93 c-50 -51 -91 -100 -91 -107 0 -27 31 -59 56 -59 18 0 36 16 71 60 25 33 48 59 50 57 9 -10 -18 -318 -32 -362 -32 -96 -118 -248 -154 -273 -43 -28 -149 -61 -221 -68 l-55 -6 -99 179 c-55 98 -106 186 -114 196 -21 24 -69 22 -82 -4 -18 -33 -3 -70 87 -215 47 -76 88 -145 91 -153 4 -12 -17 -13 -149 -8 -124 5 -356 31 -366 41 -8 8 22 194 53 326 60 261 59 259 48 278 -6 9 -25 18 -42 20 -24 2 -34 -3 -47 -22 -22 -33 -80 -318 -96 -470 l-12 -116 -26 7 c-131 31 -349 124 -441 186 -110 75 -310 260 -310 287 0 10 36 101 80 204 88 204 95 241 54 257 -47 17 -70 -10 -149 -175 l-74 -151 -26 58 c-38 81 -50 165 -39 261 l9 80 198 66 c210 70 229 81 208 126 -16 36 -61 31 -228 -26 -80 -28 -148 -48 -151 -45 -27 26 160 224 303 321 100 69 268 164 288 164 6 0 24 -24 40 -53 15 -28 57 -87 93 -129 58 -69 70 -78 100 -78 34 0 54 20 54 55 0 9 -31 49 -69 89 -72 76 -108 133 -94 147 7 7 156 34 233 42 84 9 182 6 273 -8z m2564 -14 c127 -19 173 -33 259 -83 49 -27 97 -57 107 -66 18 -16 17 -17 -10 -24 -15 -5 -75 -15 -133 -24 -112 -16 -143 -34 -133 -74 11 -40 28 -45 121 -31 48 7 118 21 157 32 38 10 76 19 83 19 19 0 106 -189 136 -295 31 -108 56 -215 50 -215 -20 0 -197 81 -363 166 -111 57 -213 104 -225 104 -29 0 -46 -18 -46 -51 0 -28 25 -49 130 -106 80 -44 321 -150 425 -188 l90 -33 -2 -93 c-5 -240 -43 -332 -202 -489 -109 -108 -149 -135 -316 -211 -130 -60 -114 -79 -152 191 -18 129 -37 245 -43 258 -7 15 -18 22 -39 22 -50 0 -55 -17 -48 -158 5 -113 29 -330 42 -389 5 -19 -2 -23 -68 -39 -76 -18 -349 -31 -410 -20 l-34 6 -8 102 c-8 116 -10 125 -37 139 -56 30 -85 -31 -69 -146 6 -42 11 -78 11 -80 0 -6 -120 31 -178 54 -88 35 -152 70 -267 146 -154 102 -236 180 -277 263 l-33 67 1 204 c1 241 -14 214 162 297 104 49 112 55 112 82 0 63 -36 66 -149 12 -45 -22 -84 -40 -86 -40 -8 0 28 108 56 169 61 132 173 236 299 275 85 27 258 60 286 54 15 -3 13 -8 -13 -38 -74 -85 -223 -292 -223 -309 0 -28 27 -51 60 -51 32 0 37 5 146 167 38 56 96 130 129 164 l60 62 95 -11 c134 -17 147 -16 165 12 32 49 -12 81 -129 93 -55 6 -57 7 -35 19 44 25 209 74 277 83 92 12 195 12 269 2z" />
    <path d="M4146 9091 c-10 -11 -24 -56 -32 -102 -46 -262 -53 -290 -108 -427 -57 -145 -66 -188 -44 -210 20 -20 66 -14 82 11 43 66 202 671 186 711 -14 39 -57 47 -84 17z" />
  </g>
</svg>`;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D | null;
  private svgImage: HTMLImageElement | null = null;
  private svgViewWidth = 2.6041666666666666666666666666667; // 50px at 1920px width
  private svgViewHeight = 3.90625; // 50px at 1280px height
  private isHovering = false;

  @Input() huntFoundFromParent: boolean | null = null;

  @ViewChild('overlayCanvas', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  dailyHunt: DailyHunt | null = null;
  huntFound = false;

  private resizeHandler = () => {
    this.setupCanvasSizeAndRedraw();
  };

  ngOnInit(): void {
    const todaysHuntSubscription = this.dailyHuntService
      .getTodaysHunt()
      .subscribe((hunt) => {
        // Eviter que le dessin soit caché dans un bord d'écran
        if (hunt) {
          // Si la position X est trop proche du bord droit
          const positionX = (hunt.positionX / 100) * window.innerWidth;
          if (window.innerWidth - positionX < 50) {
            // On place le dessin à au moins 50px du bord droit
            hunt.positionX =
              ((window.innerWidth - 50) / window.innerWidth) * 100;
          }
          // Si la position Y est trop proche du bord inférieur
          const positionY = (hunt.positionY / 100) * window.innerHeight;
          if (window.innerHeight - positionY < 50) {
            // On place le dessin à au moins 50px du bord inférieur
            hunt.positionY =
              ((window.innerHeight - 50) / window.innerHeight) * 100;
          }
        }
        this.dailyHunt = hunt;
        this.draw(); // Redessiner quand on reçoit les données
      });
    this.subscriptions.push(todaysHuntSubscription);

    const huntResultSubscription = this.dailyHuntService
      .onHuntResult()
      .subscribe((result) => {
        if (result.message === 'Success') {
          this.huntFound = true;
          this.draw(); // Redessiner pour cacher l'image
        }
      });
    this.subscriptions.push(huntResultSubscription);
  }

  ngAfterViewInit() {
    this.svgViewWidth = (50 / window.innerWidth) * 100;
    this.svgViewHeight = (50 / window.innerHeight) * 100;
    this.initCanvasAndSvg();
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('huntFoundFromParent' in changes) {
      const val = changes['huntFoundFromParent']?.currentValue;
      if (val !== undefined && val !== null) {
        this.huntFound = !!val;
        this.draw();
      }
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private initCanvasAndSvg() {
    if (!this.canvasRef) return;

    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d');

    // Créer l'image SVG
    const svgBlob = new Blob([this.svg], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    // Important pour éviter CORS dans certains cas (si tu charges externe), garder blank
    img.onload = () => {
      this.svgImage = img;
      URL.revokeObjectURL(svgUrl); // Nettoyer l'URL
      this.setupCanvasSizeAndRedraw();
      this.setupCanvasEvents(); // Configurer les événements
    };
    img.src = svgUrl;
  }

  private setupCanvasEvents() {
    if (!this.canvas) return;

    // Gestion du survol
    this.canvas.addEventListener('mousemove', (event) => {
      const wasHovering = this.isHovering;
      this.isHovering = this.isMouseOverHuntImage(event);

      if (wasHovering !== this.isHovering) {
        this.canvas.style.cursor = this.isHovering ? 'pointer' : 'default';
        // IMPORTANT: Gérer les pointer-events dynamiquement
        this.canvas.style.pointerEvents = this.isHovering ? 'auto' : 'none';
        this.draw();
      }
    });

    // Gestion du clic
    this.canvas.addEventListener('click', (event) => {
      if (this.isMouseOverHuntImage(event) && !this.huntFound) {
        this.onImageFound();
      }
    });

    // Réinitialiser le survol quand la souris quitte le canvas
    this.canvas.addEventListener('mouseleave', () => {
      if (this.isHovering) {
        this.isHovering = false;
        this.canvas.style.cursor = 'default';
        this.canvas.style.pointerEvents = 'none'; // Remettre à none
        this.draw();
      }
    });

    // Alternative plus robuste: utiliser une zone de détection invisible
    this.setupGlobalMouseTracking();
  }

  private setupGlobalMouseTracking() {
    // Écouter les mouvements de souris sur toute la window
    const globalMouseHandler = (event: MouseEvent) => {
      if (!this.canvas) return;

      const rect = this.canvas.getBoundingClientRect();
      const canvasEvent = {
        clientX: event.clientX,
        clientY: event.clientY,
      } as MouseEvent;

      const wasHovering = this.isHovering;
      this.isHovering = this.isMouseOverHuntImage(canvasEvent);

      if (wasHovering !== this.isHovering) {
        this.canvas.style.cursor = this.isHovering ? 'pointer' : 'default';
        this.canvas.style.pointerEvents = this.isHovering ? 'auto' : 'none';
        this.draw();
      }
    };

    // Écouter sur window pour capturer tous les mouvements
    window.addEventListener('mousemove', globalMouseHandler);

    // Nettoyer lors de la destruction
    this.subscriptions.push({
      unsubscribe: () =>
        window.removeEventListener('mousemove', globalMouseHandler),
    } as Subscription);
  }

  private setupCanvasSizeAndRedraw() {
    if (!this.canvas || !this.ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // CSS size (100% / fixed). Buffer size haute-DPI :
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);

    // Mettre le contexte en échelle pour dessiner en pixels CSS (pas en device px)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.draw();
  }

  private getDisplayImageSizePx(): { w: number; h: number } {
    let w = 50, h = 50;
    if (this.svgViewWidth && !isNaN(this.svgViewWidth)) {
      w = (this.svgViewWidth / 100) * window.innerWidth;
    }
    if (this.svgViewHeight && !isNaN(this.svgViewHeight)) {
      h = (this.svgViewHeight / 100) * window.innerHeight;
    }
    console.log('Display image size:', { w, h });
    return { w, h };
  }

  private isMouseOverHuntImage(event: MouseEvent): boolean {
    if (!this.dailyHunt || this.huntFound) return false;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const { w: imgW, h: imgH } = this.getDisplayImageSizePx();
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    const imgX = (this.dailyHunt.positionX / 100) * cssWidth - imgW / 2;
    const imgY = (this.dailyHunt.positionY / 100) * cssHeight - imgH / 2;

    return (
      mouseX >= imgX &&
      mouseX <= imgX + imgW &&
      mouseY >= imgY &&
      mouseY <= imgY + imgH
    );
  }

  private draw() {
    if (!this.ctx || !this.svgImage || !this.dailyHunt || this.huntFound) {
      // Si pas d'image à afficher, vider le canvas
      if (this.ctx) {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
      return;
    }

    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    // Effacer le canvas
    this.ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Calculer la taille et position
    const { w: imgW, h: imgH } = this.getDisplayImageSizePx();
    const x = (this.dailyHunt.positionX / 100) * cssWidth - imgW / 2;
    const y = (this.dailyHunt.positionY / 100) * cssHeight - imgH / 2;

    // Appliquer l'opacité selon l'état du survol
    this.ctx.globalAlpha = this.isHovering ? 1.0 : 0.1;

    // Dessiner l'image
    this.ctx.drawImage(this.svgImage, x, y, imgW, imgH);

    // Remettre l'opacité à 1
    this.ctx.globalAlpha = 1.0;
  }

  onImageFound() {
    if (!this.huntFound) {
      this.dailyHuntService.foundHunt();
    }
  }
}
