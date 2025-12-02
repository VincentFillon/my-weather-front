import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdventCalendarDay {
  day: number;
  status: 'LOCKED' | 'OPENABLE' | 'OPENED';
  content?: string;
  type?: 'image' | 'quote';
  alreadyOpened?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AdventCalendarService {
  private apiUrl = `/api/advent-calendar`;

  constructor(private http: HttpClient) {}

  getCalendar(): Observable<AdventCalendarDay[]> {
    return this.http.get<AdventCalendarDay[]>(this.apiUrl);
  }

  openDay(day: number): Observable<AdventCalendarDay> {
    return this.http.post<AdventCalendarDay>(`${this.apiUrl}/${day}/open`, {});
  }
}
