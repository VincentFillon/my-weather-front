import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);

  constructor() {
    // S'abonner aux notifications de changement d'humeur
    this.socketService.fromEvent<User>('userMoodUpdated').subscribe((user) => {
      const currentUser = this.authService.currentUser();
      if (!currentUser || currentUser._id === user._id) {
        return;
      }
      const message = `${user.username} est maintenant dans ${
        user.mood?.name || 'la zone neutre'
      }`;

      this.showNotification(message);
      this.showSystemNotification(message, user.mood?.image);
    });
  }

  public init() {
    // Demander l'autorisation d'envoyer des notifications système
    this.requestNotificationPermission();
  }

  private requestNotificationPermission() {
    if (
      'Notification' in window &&
      Notification.permission !== 'granted' &&
      Notification.permission !== 'denied'
    ) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Permission de notification accordée.');
        }
      });
    }
  }

  private showNotification(message: string) {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  private showSystemNotification(message: string, image?: string) {
    if (!('Notification' in window)) {
      console.error('Ce navigateur ne supporte pas les notifications système.');
      return;
    }

    const options: NotificationOptions = {
      body: message,
      icon: image,
    };

    if (Notification.permission === 'granted') {
      new Notification('Notification', options);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Notification', options);
        }
      });
    }
  }
}
