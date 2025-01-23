import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Role } from '../models/role.enum';
import { User } from '../models/user';

interface AuthResponse {
  user: User;
  token: string;
  expiresAt: number; // Timestamp d'expiration du token
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_REFRESH_INTERVAL = 1000 * 60 * 30; // 30 minutes
  private readonly TOKEN_EXPIRATION_TIME = 1000 * 60 * 60 * 12; // 12 heures

  private readonly API_URL = `/api/auth`;

  private http = inject(HttpClient);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();

  constructor() {
    // Vérifier si on a un token et un utilisateur stoqué dans le localStorage
    const storedUser = localStorage.getItem('currentUser');
    const expiresAt = localStorage.getItem('tokenExpiresAt');

    if (storedUser && expiresAt) {
      const expiration = parseInt(expiresAt, 10);
      if (expiration > Date.now()) {
        this.currentUserSubject.next(JSON.parse(storedUser));
        this.startTokenRefreshTimer();
        this.startInactivityCheck();
      } else {
        this.logout();
      }
    }

    // Écouter les événements d'activité utilisateur
    if (typeof window !== 'undefined') {
      ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.updateLastActivity());
      });
    }
  }

  updateLastActivity() {
    this.lastActivityTime = Date.now();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, { username, password })
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, { username, password })
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/refresh-token`, {})
      .pipe(tap((response) => this.handleAuthResponse(response)));
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    localStorage.setItem('tokenExpiresAt', response.expiresAt.toString());
    this.currentUserSubject.next(response.user);
    this.startTokenRefreshTimer();
    this.startInactivityCheck();
  }

  private startTokenRefreshTimer() {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    this.tokenRefreshTimer = setInterval(() => {
      const expiresAt = localStorage.getItem('tokenExpiresAt');
      if (!expiresAt) {
        this.logout();
        return;
      }

      const expiration = parseInt(expiresAt, 10);
      const timeUntilExpiration = expiration - Date.now();

      // Si le token expire dans moins de 30 minutes et qu'il y a eu une activité récente
      if (timeUntilExpiration < this.TOKEN_REFRESH_INTERVAL &&
        (Date.now() - this.lastActivityTime) < this.TOKEN_EXPIRATION_TIME) {
        this.refreshToken().subscribe();
      }
    }, this.TOKEN_REFRESH_INTERVAL);
  }

  private startInactivityCheck() {
    setInterval(() => {
      if ((Date.now() - this.lastActivityTime) >= this.TOKEN_EXPIRATION_TIME) {
        this.logout();
      }
    }, 60000); // Vérifier toutes les minutes
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('tokenExpiresAt');
    this.currentUserSubject.next(null);
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === Role.ADMIN;
  }

  updateUsername(username: string): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/username`, { username }).pipe(
      tap((user) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  updateImage(image: string): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/image`, { image }).pipe(
      tap((user) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  updatePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/password`, {
      currentPassword,
      newPassword,
    });
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}`);
  }
}
