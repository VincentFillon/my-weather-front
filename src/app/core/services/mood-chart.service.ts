import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MoodChartData } from '../models/mood-chart-data';

@Injectable({
  providedIn: 'root',
})
export class MoodChartService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getMoodChartData(): Observable<MoodChartData> {
    return this.http.get<MoodChartData>(`${this.apiUrl}/mood-chart`);
  }
}
