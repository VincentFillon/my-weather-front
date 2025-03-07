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
    // this.simulateDay();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  simulateDay() {
    const startOfDay = new Date();
    startOfDay.setHours(8, 0, 0, 0); // 8h00

    const endOfDay = new Date();
    endOfDay.setHours(18, 30, 0, 0); // 18h30

    let now = new Date(startOfDay.getTime());
    const interval = setInterval(() => {
      if (now.getTime() <= endOfDay.getTime()) {
        this.updateTimer(now);
        now = new Date(now.getTime() + 3 * 60 * 1000); // Avance de 3 minutes
      } else {
        clearInterval(interval);
        this.simulateDay(); // Recommence une journée
      }
    }, 100);
  }

  /**
   * Démarre le minuteur en s'abonnant à un observable d'intervalle et en appelant
   * `updateTimer` toutes les secondes.
   */
  startTimer() {
    this.subscription = interval(1000).subscribe(() => {
      this.updateTimer();
    });
  }

  /**
   * Mise à jour de la phase de la journée et du temps restant.
   */
  updateTimer(now: Date = new Date()) {
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    let startTime: Date | null = null;
    let endTime: Date | null = null;

    // Lundi à jeudi
    if (day >= 1 && day <= 4) {
      // Avant le matin
      if (hours < 8 || (hours === 8 && minutes < 30)) {
        this.phase = DayPhases.BEFORE_WORK;
      }
      // Matin
      else if (
        (hours > 8 && hours < 12) ||
        (hours === 8 && minutes >= 30) ||
        (hours === 12 && minutes < 30)
      ) {
        this.phase = DayPhases.WORKING;

        startTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          8,
          30,
          0
        );

        endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          12 + 4, // Prendre en compte les heures de l'après midi
          30,
          0
        );
      }
      // Pause déjeuner
      else if ((hours === 12 && minutes >= 30) || hours === 13) {
        this.phase = DayPhases.BREAK;
      }
      // Après-midi
      else if (hours >= 14 && hours < 18) {
        this.phase = DayPhases.WORKING;

        startTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          8 + 1, // Prendre en compte la pause déjeuner
          30 + 30, // Prendre en compte la pause déjeuner
          0
        );

        endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          18,
          0,
          0
        );
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
        (hours > 8 && hours < 12) ||
        (hours === 8 && minutes >= 30) ||
        (hours === 12 && minutes < 30)
      ) {
        this.phase = DayPhases.WORKING;

        startTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          8,
          30,
          0
        );

        endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          12 + 3, // Prendre en compte les heures de l'après midi
          30,
          0
        );
      }
      // Pause déjeuner
      else if ((hours === 12 && minutes >= 30) || hours === 13) {
        this.phase = DayPhases.BREAK;
      }
      // Après-midi
      else if (hours >= 14 && hours < 17) {
        this.phase = DayPhases.WORKING;

        startTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          8 + 1, // Prendre en compte la pause déjeuner
          30 + 30, // Prendre en compte la pause déjeuner
          0
        );

        endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          17,
          0,
          0
        );
      }
      // Fin de journée
      else {
        this.phase = DayPhases.AFTER_WORK;
      }
    } else {
      this.phase = DayPhases.WEEKEND;
    }

    if (startTime && endTime) {
      this.color = this.calculateColor(startTime, endTime, now);
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
      this.color = 'initial'; // Couleur parente pour hors des heures de travail
    }
  }

  /**
   * Calcule une couleur basée sur le temps restant jusqu'à la fin de la journée de travail.
   * La couleur est un dégradé du rouge (début de la journée) au vert (fin de la journée).
   * @param startTime L'heure du début de la journée de travail.
   * @param endTime L'heure de fin de la journée de travail.
   * @param now L'heure actuelle.
   * @returns Une chaîne représentant la couleur au format RGB.
   */
  calculateColor(
    startTime: Date,
    endTime: Date,
    now: Date = new Date()
  ): string {
    const totalDiff = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    let ratio = elapsed / totalDiff;

    // Assure que le ratio reste entre 0 et 1
    ratio = Math.min(1, Math.max(0, ratio));

    console.debug('Ratio initial : ', ratio);

    // Utilisation d'une fonction logarithmique inversée pour la progression
    if (ratio > 0) {
      ratio = 1 - Math.log(1 + (Math.E - 1) * (1 - ratio));
      console.debug('Ratio (log) : ', ratio);
    }

    // Calcul des couleurs
    let red: number, green: number, blue: number;
    if (ratio < 0.5) {
        // Dégradé du rouge à l'orange
        red = 255;
        green = Math.round(165 * 2 * ratio);
        blue = 0;
    } else {
        // Dégradé de l'orange au vert foncé
        const ratio2 = (ratio - 0.45) * 2; // Ratio pour la seconde moitié
        red = Math.round(255 * (1 - ratio2)); // Diminue le rouge
        green = Math.round(82 * (1 + ratio2)); // Augmente le vert
        blue = Math.round(50 * ratio2); // Ajoute un peu de bleu pour le vert foncé
    }

    // Assure que les valeurs restent entre 0 et 255
    red = Math.min(255, Math.max(0, red));
    green = Math.min(255, Math.max(0, green));
    blue = Math.min(255, Math.max(0, blue));

    return `rgb(${red}, ${green}, ${blue})`;
  }

  /**
   * Formate une heure en heures, minutes et secondes en une chaîne 'HH:MM:SS'.
   * @param hours Le nombre d'heures.
   * @param minutes Le nombre de minutes.
   * @param seconds Le nombre de secondes.
   * @returns La chaîne de temps formatée.
   */
  formatTime(hours: number, minutes: number, seconds: number): string {
    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  /**
   * Ajoute un zéro devant un nombre s'il est inférieur à 10.
   * @param num Le nombre à compléter.
   * @returns Le nombre complété sous forme de chaîne.
   */
  pad(num: number): string {
    return num.toString().padStart(2, '0');
  }
}
