import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
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
export class DailyHuntComponent implements OnInit, OnDestroy, OnChanges {
  private dailyHuntService = inject(DailyHuntService);
  private subscriptions: Subscription[] = [];

  // Statut fourni par le parent uniquement (autonomie conservée pour le reste)
  @Input() huntFoundFromParent: boolean | null = null;

  dailyHunt: DailyHunt | null = null;
  huntFound = false;

  ngOnInit(): void {
    const todaysHuntSubscription = this.dailyHuntService
      .getTodaysHunt()
      .subscribe((hunt) => {
        // Eviter que le dessin soit caché dans un bord d'écran
        if (hunt) {
          // Si la position X est trop proche du bord droit
          const positionX = hunt.positionX / 100 * window.innerWidth;
          if (window.innerWidth - positionX < 50) {
            // On place le dessin à au moins 50px du bord droit
            hunt.positionX = (window.innerWidth - 50) / window.innerWidth * 100;
          }
          // Si la position Y est trop proche du bord inférieur
          const positionY = hunt.positionY / 100 * window.innerHeight;
          if (window.innerHeight - positionY < 50) {
            // On place le dessin à au moins 50px du bord inférieur
            hunt.positionY = (window.innerHeight - 50) / window.innerHeight * 100;
          }
        }
        this.dailyHunt = hunt;
      });
    this.subscriptions.push(todaysHuntSubscription);

    const huntResultSubscription = this.dailyHuntService
      .onHuntResult()
      .subscribe((result) => {
        if (result.message === 'Success') {
          this.huntFound = true;
        }
      });
    this.subscriptions.push(huntResultSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('huntFoundFromParent' in changes) {
      const val = changes['huntFoundFromParent']?.currentValue;
      if (val !== undefined && val !== null) {
        this.huntFound = !!val;
      }
    }
  }

  onImageFound() {
    if (!this.huntFound) {
      this.dailyHuntService.foundHunt();
    }
  }
}
