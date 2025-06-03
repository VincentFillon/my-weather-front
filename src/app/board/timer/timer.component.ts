import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';

/**
 * Un champ d'un InterruptionDate peut être :
 * - un number (ex : 5)
 * - une string CRON style (ex : "1-4", "1,3,5")
 * - undefined (joker)
 */
type CronField = number | string | undefined;

/**
 * Spécifications de la date d'interruption (début ou fin).
 * Si toutes les propriétés sont remplies, l'interruption n'aura lieu qu'à cet instant précis.
 * Si en revenche seulement certaines propriétés sont remplies, l'interruption aura lieu à chaque fois que la date correspondra à ces propriétés.
 * @exemple
 * ```ts
 * // Interruption de 10 secondes le 15 mai 2023 à 10h30
 * const ponctualInterruptionFrom: InterruptionDate = {
 *   year: 2023,
 *   month: 5,
 *   date: 15,
 *   hour: 10,
 *   minute: 30,
 *   second: 0
 * };
 * const ponctualInterruptionTo: InterruptionDate = {
 *   year: 2023,
 *   month: 5,
 *   date: 15,
 *   hour: 10,
 *   minute: 30,
 *   second: 10
 * };
 *
 * // Interruption de 10 secondes tous les jours à 10h30
 * const dailyInterruptionFrom: InterruptionDate = {
 *   hour: 10,
 *   minute: 30,
 *   second: 0
 * };
 * const dailyInterruptionTo: InterruptionDate = {
 *   hour: 10,
 *   minute: 30,
 *   second: 10
 * };
 * ```
 */
interface InterruptionDate {
  /** Année */
  year?: CronField;
  /** Mois (1-12) */
  month?: CronField;
  /** Jour du mois (1-31) */
  date?: CronField;
  /** Jour de la semaine (0-6) */
  day?: CronField;
  /** Heure (0-23) */
  hour?: CronField;
  /** Minute (0-59) */
  minute?: CronField;
  /** Seconde (0-59) */
  second?: CronField;
}

export interface Interruption {
  /** Début de l'interruption (cf. {@link InterruptionDate}) */
  from: InterruptionDate;
  /** Fin de l'interruption (cf. {@link InterruptionDate}) */
  to: InterruptionDate;
  /** Libellé de l'interruption */
  label: string;
  /** Couleur (css) à appliquer au libellé de l'interruption */
  color?: string;
}

@Component({
  selector: 'app-timer',
  standalone: true,
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss'],
})
export class TimerComponent implements OnInit, OnDestroy {
  private subscription: Subscription | undefined;

  /**
   * Date de fin du timer
   */
  @Input() endTime: Date | null = null;

  /**
   * (Optionnel) Date de début du timer.
   * Si non spécifiée, le minuteur commence au début de la journée en cours.
   */
  @Input() startTime: Date | null = null;

  /**
   * (Optionnel) Liste d'interruptions dans le timer.
   * La durée de l'interruption est décomptée du temps restant.
   * Pendant l'interruption, le label de l'interruption est affiché à la place du minuteur.
   */
  @Input() interruptions: Interruption[] = [];

  interruption: Interruption | null = null;

  /**
   * (Optionnel) Libellé à insérer avant le timer.
   * Par défaut : 'encore '
   */
  @Input() labelBeforeTimer: string = 'encore ';

  /**
   * (Optionnel) Libellé à insérer après le timer.
   * Par défaut : ''
   */
  @Input() labelAfterTimer: string = '';

  /**
   * (Optionnel) Si true, la durée des interruptions futures est déduite du temps restant affiché.
   * Par défaut : false
   */
  @Input() excludeInterruptsFromTimeLeft: boolean = false;

  timeLeft: string = '00:00:00';
  color: string = 'red';

  ngOnInit() {
    this.startTimer();
    // this.simulateDay();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private simulateDay() {
    const startOfDay = new Date();
    startOfDay.setHours(4, 0, 0, 0); // 04h00

    const endOfDay = new Date();
    endOfDay.setHours(20, 30, 0, 0); // 20h30

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
   * Vérifie si la valeur d'une date JS (value) matche la syntaxe de champ CRON (cf ci-dessus).
   * Supporte number, "1-2", "1,2,3", combinaison de ranges et valeurs simples ("1-3,5,8-10").
   * @param field le CronField à matcher
   * @param value la valeur numérique courante (ex: 2 pour vérifier si c'est un mardi)
   */
  private cronFieldMatches(field: CronField, value: number): boolean {
    if (field === undefined) return true;
    if (typeof field === 'number') return value === field;
    // Ici field est de type string, par exemple "1-4" ou "1,3,5"
    // On découpe sur la virgule ou reste simple
    const parts = field.split(',');
    for (const part of parts) {
      if (/^\d+$/.test(part)) {
        // valeur simple
        if (parseInt(part, 10) === value) return true;
      } else if (/^(\d+)-(\d+)$/.test(part)) {
        // intervalle
        const [, start, end] = part.match(/^(\d+)-(\d+)$/)!;
        const s = parseInt(start, 10);
        const e = parseInt(end, 10);
        if (value >= s && value <= e) return true;
      }
      // TODO: gérer des /step comme "1-10/2"
    }
    return false;
  }

  /**
   * Vérifie si la date courante correspond au pattern donné façon CRON/range.
   */
  private matchDate(now: Date, pattern: InterruptionDate): boolean {
    return (
      this.cronFieldMatches(pattern.year, now.getFullYear()) &&
      this.cronFieldMatches(pattern.month, now.getMonth() + 1) && // mois JS = 0-indexed
      this.cronFieldMatches(pattern.date, now.getDate()) &&
      this.cronFieldMatches(pattern.day, now.getDay()) &&
      this.cronFieldMatches(pattern.hour, now.getHours()) &&
      this.cronFieldMatches(pattern.minute, now.getMinutes()) &&
      this.cronFieldMatches(pattern.second, now.getSeconds())
    );
  }

  /**
   * Vérifie si le pattern de date (année, mois, jour, jour de semaine) de la date courante correspond au pattern donné.
   * Ne prend pas en compte les heures, minutes, secondes.
   */
  private matchDatePattern(now: Date, pattern: InterruptionDate): boolean {
    const yearMatch = this.cronFieldMatches(pattern.year, now.getFullYear());
    const monthMatch = this.cronFieldMatches(pattern.month, now.getMonth() + 1); // mois JS = 0-indexed
    const dateMatch = this.cronFieldMatches(pattern.date, now.getDate());
    const dayMatch = this.cronFieldMatches(pattern.day, now.getDay());
    // console.log(`[matchDatePattern] now: ${now.toISOString()}, pattern:`, JSON.stringify(pattern));
    // console.log(`[matchDatePattern] Results: year=${yearMatch}, month=${monthMatch}, date=${dateMatch}, day=${dayMatch}`);
    return yearMatch && monthMatch && dateMatch && dayMatch;
  }

  /**
   * Crée une date JS à partir d'un InterruptionDate pour le contexte donné.
   */
  private buildDate(base: Date, d: InterruptionDate): Date {
    return new Date(
      typeof d.year === 'number' ? d.year : base.getFullYear(),
      typeof d.month === 'number' ? d.month - 1 : base.getMonth(),
      typeof d.date === 'number' ? d.date : base.getDate(),
      typeof d.hour === 'number' ? d.hour : 0,
      typeof d.minute === 'number' ? d.minute : 0,
      typeof d.second === 'number' ? d.second : 0,
      0
    );
  }

  /**
   * Détermine si on est dans une interruption, adapté à la syntaxe CRON/range.
   */
  private isInInterruption(now: Date, interruption: Interruption): boolean {
    // On vérifie si le pattern de date (jour de la semaine, etc.) correspond.
    // console.log(`[isInInterruption] now: ${now.toISOString()}, interruption.from:`, JSON.stringify(interruption.from));
    const patternMatches = this.matchDatePattern(now, interruption.from);
    // console.log(`[isInInterruption] matchDatePattern(from) result: ${patternMatches}`);
    if (!patternMatches) return false;

    // Fabrique la date de début et de fin pour today.
    const fromDate = this.buildDate(now, interruption.from);
    const toDate = this.buildDate(now, interruption.to);
    // console.log(`[isInInterruption] fromDate: ${fromDate.toISOString()}, toDate: ${toDate.toISOString()}`);

    if (toDate.getTime() < fromDate.getTime()) {
      // L'interruption déborde sur le lendemain
      // console.log(`[isInInterruption] Interruption déborde sur le lendemain. now (${now.getTime()}) >= fromDate (${fromDate.getTime()}) || now (${now.getTime()}) <= toDate (${toDate.getTime()})`);
      if (now >= fromDate || now <= toDate) return true;
    } else {
      // console.log(`[isInInterruption] Interruption dans la même journée. now (${now.getTime()}) >= fromDate (${fromDate.getTime()}) && now (${now.getTime()}) <= toDate (${toDate.getTime()})`);
      if (now >= fromDate && now <= toDate) return true;
    }
    // console.log(`[isInInterruption] Aucune condition remplie, retour false.`);
    return false;
  }

  /**
   * Démarre le minuteur en s'abonnant à un observable d'intervalle et en appelant
   * `updateTimer` toutes les secondes.
   */
  private startTimer() {
    this.subscription = interval(1000).subscribe(() => {
      this.updateTimer();
    });
  }

  /**
   * Mise à jour du temps restant.
   */
  private updateTimer(now: Date = new Date()) {
    // console.log(`[updateTimer] Called with now: ${now.toISOString()}`);
    // console.log(`[updateTimer] this.interruptions:`, JSON.stringify(this.interruptions));
    this.interruption = null;
    for (const intr of this.interruptions) {
      // console.log(`[updateTimer] Checking interruption:`, JSON.stringify(intr));
      if (this.isInInterruption(now, intr)) {
        // console.log(`[updateTimer] Interruption found:`, JSON.stringify(intr));
        this.interruption = intr;
        break;
      }
    }
    // console.log(`[updateTimer] Final this.interruption:`, JSON.stringify(this.interruption));

    const startTime =
      this.startTime ||
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endTime =
      this.endTime ||
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    this.color = this.calculateColor(startTime, endTime, now);
    let diff = endTime.getTime() - now.getTime();

    if (this.excludeInterruptsFromTimeLeft && this.interruptions.length > 0) {
      let interruptionsDurationToExclude = 0;
      for (const intr of this.interruptions) {
        // Vérifier d'abord si le pattern de date de l'interruption correspond au jour 'now'
        if (!this.matchDatePattern(now, intr.from)) {
          continue; // Passer à l'interruption suivante si le pattern de date ne correspond pas
        }

        // Construire les dates de début et de fin de l'interruption pour le contexte de 'now'
        // afin de gérer correctement les interruptions qui s'étalent sur plusieurs jours par rapport à 'now'
        const intrFromDateFull = this.buildDate(now, intr.from);
        const intrToDateFull = this.buildDate(now, intr.to);

        // Ajuster si l'interruption 'to' est avant 'from' (ex: interruption de 22h à 02h)
        // et que 'now' est après minuit mais avant la fin de l'interruption.
        if (intrToDateFull.getTime() < intrFromDateFull.getTime()) {
          // Si 'now' est le jour J+1 et l'interruption a commencé le jour J et finit sur J+1
          if (
            now.getDate() !== intrFromDateFull.getDate() &&
            now <= intrToDateFull
          ) {
            // L'interruption a commencé la veille, on prend le début de la journée de 'now' comme point de départ effectif
            const startOfNowDay = new Date(now);
            startOfNowDay.setHours(0, 0, 0, 0);
            const durationPart1 = Math.max(
              0,
              Math.min(intrToDateFull.getTime(), endTime.getTime()) -
                Math.max(startOfNowDay.getTime(), now.getTime())
            );
            if (durationPart1 > 0) {
              // console.log(`[updateTimer] Adding to exclude (overflow, now is D+1): ${durationPart1 / 1000}s for interruption`, JSON.stringify(intr));
              interruptionsDurationToExclude += durationPart1;
            }
          }
          // Si 'now' est le jour J et l'interruption commence le jour J et finit sur J+1
          else if (now >= intrFromDateFull) {
            const durationPart1 = Math.max(
              0,
              Math.min(
                new Date(intrFromDateFull).setHours(23, 59, 59, 999),
                endTime.getTime()
              ) - Math.max(intrFromDateFull.getTime(), now.getTime())
            );
            if (durationPart1 > 0) {
              //  console.log(`[updateTimer] Adding to exclude (overflow, part on D): ${durationPart1 / 1000}s for interruption`, JSON.stringify(intr));
              interruptionsDurationToExclude += durationPart1;
            }
            // Ajouter la partie du lendemain si applicable
            const startOfNextDay = new Date(intrFromDateFull);
            startOfNextDay.setDate(startOfNextDay.getDate() + 1);
            startOfNextDay.setHours(0, 0, 0, 0);
            if (intrToDateFull > startOfNextDay) {
              // S'assurer que l'interruption se prolonge effectivement au lendemain
              const effectiveSegmentStartForNextDay = startOfNextDay.getTime();
              // On ne veut exclure que la portion de l'interruption qui est *après* 'now' et *avant* 'endTime'.
              // Et aussi, cette portion doit être après le début effectif du segment du lendemain.
              const actualStartForThisSegment = Math.max(
                effectiveSegmentStartForNextDay,
                now.getTime()
              );
              const durationNextDayPart = Math.max(
                0,
                Math.min(intrToDateFull.getTime(), endTime.getTime()) -
                  actualStartForThisSegment
              );

              if (durationNextDayPart > 0) {
                // console.log(`[updateTimer] Adding to exclude (overflow, part on D+1): ${durationNextDayPart / 1000}s for interruption`, JSON.stringify(intr));
                interruptionsDurationToExclude += durationNextDayPart;
              }
            }
          }
        } else {
          // Cas standard : interruption dans la même journée calendaire
          const effectiveIntrStart = Math.max(
            intrFromDateFull.getTime(),
            now.getTime()
          );
          const effectiveIntrEnd = Math.min(
            intrToDateFull.getTime(),
            endTime.getTime()
          );
          if (effectiveIntrEnd > effectiveIntrStart) {
            const durationAdded = effectiveIntrEnd - effectiveIntrStart;
            // console.log(`[updateTimer] Adding to exclude (same day): ${durationAdded / 1000}s for interruption`, JSON.stringify(intr));
            interruptionsDurationToExclude += durationAdded;
          }
        }
      }
      // console.log(`[updateTimer] Total interruption duration to exclude: ${interruptionsDurationToExclude / 1000}s`);
      diff -= interruptionsDurationToExclude;
    }

    if (diff > 0) {
      const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
      this.timeLeft = this.formatTime(
        daysLeft,
        hoursLeft,
        minutesLeft,
        secondsLeft
      );
    } else {
      this.timeLeft = '00:00:00';
    }
  }

  /**
   * Calcule une couleur basée sur le temps restant jusqu'à la fin du timer.
   * La couleur est un dégradé du rouge (début du timer) au vert (fin du timer).
   * @param startTime La date de du début du timer.
   * @param endTime La date de fin du timer.
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

    // console.debug('Ratio initial : ', ratio);

    // Utilisation d'une fonction logarithmique inversée pour la progression
    if (ratio > 0) {
      ratio = 1 - Math.log(1 + (Math.E - 1) * (1 - ratio));
      // console.debug('Ratio (log) : ', ratio);
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
   * @param days Le nombre de jours.
   * @param hours Le nombre d'heures.
   * @param minutes Le nombre de minutes.
   * @param seconds Le nombre de secondes.
   * @returns La chaîne de temps formatée.
   */
  formatTime(
    days: number,
    hours: number,
    minutes: number,
    seconds: number
  ): string {
    if (days > 0) {
      return `${this.pad(days)}j ${this.pad(hours)}:${this.pad(
        minutes
      )}:${this.pad(seconds)}`;
    }
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
