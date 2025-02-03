import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TicTacToe } from '../models/tic-tac-toe';
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
  private router = inject(Router);

  constructor() {}

  public init() {
    // Demander l'autorisation d'envoyer des notifications système
    this.requestNotificationPermission();

    this.authService.currentUser$.subscribe((currentUser) => {
      // console.debug('[NotificationService] currentUser:', currentUser);
      if (currentUser) {
        // S'abonner aux notifications de changement d'humeur
        console.debug("Souscription aux changements d'humeur");
        this.socketService
          .fromEvent<User>('userMoodUpdated')
          .subscribe((user) => {
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

        // S'abonner aux création de nouvelles parties
        console.debug('Souscription aux nouvelles parties de morpion');
        this.socketService
          .fromEvent<TicTacToe>('ticTacToeCreated')
          .subscribe((game) => {
            console.debug(game);
            if (
              !currentUser ||
              (currentUser._id !== game.playerX._id &&
                (!game.playerO || currentUser._id !== game.playerO._id))
            ) {
              return;
            }

            const otherPlayer =
              game.playerO && game.playerO._id === currentUser._id
                ? game.playerX
                : game.playerO;
            if (!otherPlayer) return;

            const message = `${otherPlayer.username} a démarré une partie de morpion avec vous`;

            this.showNotification(
              message,
              () => {
                this.router.navigate(['/games', game._id]);
              },
              'Jouer'
            );
            this.showSystemNotification(message, undefined, () => {
              this.router.navigate(['/games', game._id]);
            });
          });
      }
    });
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

  private showNotification(
    message: string,
    action?: () => void,
    actionLabel = 'Fermer'
  ) {
    const snackBarRef = this.snackBar.open(message, actionLabel, {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification'],
    });

    if (action != null) {
      snackBarRef.onAction().subscribe(() => {
        action();
      });
    }
  }

  private showSystemNotification(
    message: string,
    image?: string,
    action?: () => void
  ) {
    if (!('Notification' in window)) {
      console.error('Ce navigateur ne supporte pas les notifications système.');
      return;
    }

    const options: NotificationOptions = {
      body: message,
      icon: image,
    };

    if (action != null) options.requireInteraction = true;

    if (Notification.permission === 'granted') {
      const notif = new Notification('Ma Météo', options);
      notif.onclick = () => {
        if (action != null) {
          action();
        }
      };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          const notif = new Notification('Ma Météo', options);
          notif.onclick = () => {
            if (action) {
              action();
            }
          };
        }
      });
    }
  }
}
