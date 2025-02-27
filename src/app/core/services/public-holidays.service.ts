import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PublicHoliday } from '../models/public-holiday';

@Injectable({
  providedIn: 'root',
})
export class PublicHolidaysService {
  private readonly API_URL = `/api/public-holidays`;

  constructor(private http: HttpClient) {}

  findAll() {
    return this.http.get<PublicHoliday[]>(this.API_URL);
  }

  findForYear(year: string) {
    return this.http.get<PublicHoliday[]>(`${this.API_URL}/year/${year}`);
  }

  findNext() {
    return this.http.get<PublicHoliday>(`${this.API_URL}/next`);
  }
}
