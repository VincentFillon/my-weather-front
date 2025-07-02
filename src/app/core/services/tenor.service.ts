import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TenorResponse } from '../models/tenor-response';

@Injectable({
  providedIn: 'root',
})
export class TenorService {
  private http = inject(HttpClient);

  getTrendingGifs(
    limit: number = 20,
    next: string = ''
  ): Observable<TenorResponse> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    if (next) params = params.set('next', next);

    return this.http.get<TenorResponse>('api/tenor/trending', {
      params,
    });
  }

  searchGifs(
    query: string,
    limit: number = 20,
    next: string = ''
  ): Observable<TenorResponse> {
    let params = new HttpParams().set('q', query);
    if (limit) params = params.set('limit', limit.toString());
    if (next) params = params.set('next', next);

    return this.http.get<TenorResponse>('api/tenor/search', {
      params,
    });
  }
}
