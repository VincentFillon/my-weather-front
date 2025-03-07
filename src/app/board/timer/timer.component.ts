import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';

enum DayPhases {
  /** Journée terminée */
  AFTER_WORK = 'afterWork',
  /** Journée pas commencée */
  BEFORE_WORK = 'beforeWork',
  /** Pause déjeuner */
  BREAK = 'break',
  /** Heure de travail */
  WORKING = 'working',
  /** Week-end */
  WEEKEND = 'weekend',
}

@Component({
  selector: 'app-timer',
  standalone: true,
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss'],
})
export class TimerComponent implements OnInit, OnDestroy {
  phase: DayPhases = DayPhases.BEFORE_WORK;
  timeLeft: string = '00:00:00';
  color: string = 'red';
  private subscription: Subscription | undefined;

  ngOnInit() {
    this.startTimer();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  startTimer() {
    this.subscription = interval(1000).subscribe(() => {
      this.updateTimer();
    });
  }

  updateTimer() {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    let endTime: Date | null = null;

    // Lundi à jeudi
    if (day >= 1 && day <= 4) {
      // Avant le matin
      if (hours < 8 || (hours === 8 && minutes < 30)) {
        this.phase = DayPhases.BEFORE_WORK;
      }
      // Matin
      if (hours >= 8 && (hours < 12 || (hours === 12 && minutes < 30))) {
        this.phase = DayPhases.WORKING;

        endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          12 + 4, // Prendre en compte les heures de l'après midi
          30,
          0
        );
        this.color = this.calculateColor(now, endTime);
      }
      // Pause déjeuner
      else if (
        hours >= 12 &&
        hours < 14 &&
        (hours > 12 || (hours === 12 && minutes >= 30))
      ) {
        this.phase = DayPhases.BREAK;
      }
      // Après-midi
      else if (hours >= 14 && hours < 18) {
        this.phase = DayPhases.WORKING;

        endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          18,
          0,
          0
        );
        this.color = this.calculateColor(now, endTime);
      }
      // Fin de journée
      else {
        this.phase = DayPhases.AFTER_WORK;
      }
    }
    // Vendredi
    else if (day === 5) {
      // Avant le matin
      if (hours < 8 || (hours === 8 && minutes < 30)) {
        this.phase = DayPhases.BEFORE_WORK;
      }
      // Matin
      else if (
        hours > 8 ||
        (hours === 8 && minutes >= 30) ||
        hours < 12 ||
        (hours === 12 && minutes < 30)
      ) {
        this.phase = DayPhases.WORKING;

        endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          12 + 3, // Prendre en compte les heures de l'après midi
          30,
          0
        );
        this.color = this.calculateColor(now, endTime);
      }
      // Pause déjeuner
      else if (
        hours >= 12 &&
        hours < 14 &&
        (hours > 12 || (hours === 12 && minutes >= 30))
      ) {
        this.phase = DayPhases.BREAK;
      }
      // Après-midi
      else if (hours >= 14 && hours < 17) {
        this.phase = DayPhases.WORKING;

        endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          17,
          0,
          0
        );
        this.color = this.calculateColor(now, endTime);
      }
      // Fin de journée
      else {
        this.phase = DayPhases.AFTER_WORK;
      }
    } else {
      this.phase = DayPhases.WEEKEND;
    }

    if (endTime) {
      const diff = endTime.getTime() - now.getTime();
      if (diff > 0) {
        const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
        const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
        this.timeLeft = this.formatTime(hoursLeft, minutesLeft, secondsLeft);
      } else {
        this.timeLeft = '00:00:00';
      }
    } else {
      this.timeLeft = '00:00:00';
      this.color = 'black'; // Ou toute autre couleur pour hors des heures de travail
    }
  }

  calculateColor(now: Date, endTime: Date): string {
    const totalDiff = endTime.getTime() - now.getTime();
    const elapsed = new Date().getTime() - now.getTime();
    const ratio = elapsed / totalDiff;
    const red = Math.round(255 * (1 - ratio));
    const green = Math.round(255 * ratio);

    return `rgb(${red}, ${green}, 0)`;
  }

  formatTime(hours: number, minutes: number, seconds: number): string {
    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  pad(num: number): string {
    return num.toString().padStart(2, '0');
  }
}
