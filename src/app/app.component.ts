import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { SocketService } from './core/services/socket.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  private currentUserSubscription: Subscription | null = null;
  private socketSubscription: Subscription | null = null;

  ngOnInit() {
    this.currentUserSubscription = this.authService.currentUser$.subscribe(
      (user) => {
        if (!user) {
          this.router.navigate(['/auth/login']);
        } else {
          const token = this.authService.getToken();
          if (token) {
            this.socketSubscription = this.socketService
              .initSocket(token)
              .subscribe((connected) => {
                if (connected) {
                  this.notificationService.init();
                }
              });
          }
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }
}
