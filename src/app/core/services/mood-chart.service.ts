import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MoodChartData } from '../models/mood-chart-data';

@Injectable({
  providedIn: 'root',
})
export class MoodChartService {
  private http = inject(HttpClient);

  getMoodChartData(days: number = 7): Observable<MoodChartData[]> {
    return this.http.get<MoodChartData[]>('/api/mood-chart', {
      params: { days: days.toString() },
    });
  }
}
