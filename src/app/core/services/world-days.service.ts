import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { WorldDay } from '../models/world-day';

@Injectable({
  providedIn: 'root',
})
export class WorldDaysService {
  private readonly jsonUrl = 'assets/world-days.json'; // Chemin du fichier JSON local
  private worldDays: WorldDay[] = []; // Données en mémoire

  constructor(private http: HttpClient) {}

  /** Permet de savoir si deux dates sont le même jour */
  private sameDay(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /** Charger les données du fichier JSON */
  private loadWorldDays(): Observable<WorldDay[]> {
    if (this.worldDays.length > 0) {
      return of(this.worldDays); // Si les données sont déjà en mémoire, on les renvoie directement
    }

    return this.http
      .get<WorldDay[]>(this.jsonUrl)
      .pipe(
        map((elems) =>
          elems.map((e) => {
            return {
              date: new Date(e.date),
              title: e.title,
              link: e.link,
            };
          })
        )
      )
      .pipe(
        catchError((error) => {
          console.error('Erreur lors du chargement du JSON', error);
          return of([]); // Si une erreur se produit, renvoie un tableau vide
        })
      );
  }

  /** Méthode pour récupérer toutes les journées */
  getAll(): Observable<WorldDay[]> {
    return this.loadWorldDays();
  }

  /** Méthode pour récupérer le jour courant */
  getToday(): Observable<WorldDay | undefined> {
    return this.loadWorldDays().pipe(
      map((worldDays: WorldDay[]) => {
        const today = new Date();
        return worldDays.find((j) => this.sameDay(j.date, today));
      })
    );
  }

  /** Méthode pour récupérer le jour J+1 (demain) */
  getTomorrow(): Observable<WorldDay | undefined> {
    return this.loadWorldDays().pipe(
      map((worldDays) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return worldDays.find((j) => this.sameDay(j.date, tomorrow));
      })
    );
  }

  /** Méthode pour récupérer les journées entre 2 dates */
  getDaysBetween(startDate: Date, endDate: Date): Observable<WorldDay[]> {
    return this.loadWorldDays().pipe(
      map((worldDays) => {
        return worldDays.filter(
          (j) => j.date >= startDate && j.date <= endDate
        );
      })
    );
  }
}
