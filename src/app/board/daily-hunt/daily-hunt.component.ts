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
