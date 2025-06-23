import { Injectable, inject } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  NotificationComponent,
  NotificationData,
} from '../components/notification/notification.component';
import { Pong } from '../models/pong';
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

    this.authService.currentUser$.subscribe((connectedUser) => {
      // console.debug('[NotificationService] currentUser:', currentUser);
      if (connectedUser) {
        // S'abonner aux notifications de changement d'humeur
        console.debug("Souscription aux changements d'humeur");
        this.socketService
          .fromEvent<User>('userMoodUpdated')
          .subscribe((user) => {
            const currentUser = this.authService.currentUser();
            if (!currentUser || currentUser._id === user._id) {
              return;
            }
            const message = `${user.displayName} est maintenant dans ${
              user.mood?.name || 'la zone neutre'
            }`;

            this.showNotification({
              title: "Changement d'humeur",
              image: user.mood?.image,
              content: message,
            });
            this.showSystemNotification(message, user.mood?.image);
          });

        // S'abonner aux création de nouvelles parties de morpion
        console.debug('Souscription aux nouvelles parties de morpion');
        this.socketService
          .fromEvent<TicTacToe>('ticTacToeCreated')
          .subscribe((game) => {
            // console.debug(game);

            // On vérifie que ça n'est pas une partie contre l'ordinateur
            if (!game.playerO) return;

            const currentUser = this.authService.currentUser();
            // On vérifie si l'utilisateur est concerné par la partie
            if (
              !currentUser ||
              (currentUser._id !== game.playerX._id &&
                currentUser._id !== game.playerO._id)
            ) {
              return;
            }

            let message = 'Une partie de morpion a démarré';
            let image = 'assets/defaut-avatar.png';
            if (game.playerO._id === currentUser._id) {
              message = `${game.playerX.displayName} a démarré une partie de morpion avec vous`;
              if (game.playerX.image) image = game.playerX.image;
            } else if (game.playerX._id === currentUser._id) {
              message = `Vous avez démarré une partie de morpion avec ${game.playerO.displayName}`;
              if (game.playerO.image) image = game.playerO.image;
            }

            this.showNotification({
              title: 'Moprion',
              image,
              content: message,
              actions: [
                {
                  label: 'Jouer',
                  icon: 'sports_esports',
                  action: () => {
                    this.router.navigate(['/games/tic-tac-toe', game._id]);
                  },
                },
              ],
            });
            this.showSystemNotification(message, undefined, () => {
              this.router.navigate(['/games/tic-tac-toe', game._id]);
            });
          });

        // S'abonner aux création de nouvelles parties de pong
        console.debug('Souscription aux nouvelles parties de pong');
        this.socketService.fromEvent<Pong>('pongCreated').subscribe((game) => {
          // console.debug(game);

          // On vérifie que ça n'est pas une partie contre l'ordinateur
          if (!game.player2) return;

          const currentUser = this.authService.currentUser();
          // On vérifie si l'utilisateur est concerné par la partie
          if (
            !currentUser ||
            (currentUser._id !== game.player1._id &&
              currentUser._id !== game.player2._id)
          ) {
            return;
          }

          let message = 'Une partie de pong a démarré';
          let image = 'assets/defaut-avatar.png';
          if (game.player2._id === currentUser._id) {
            message = `${game.player1.displayName} a démarré une partie de pong avec vous`;
            if (game.player1.image) image = game.player1.image;
          } else if (game.player1._id === currentUser._id) {
            message = `Vous avez démarré une partie de pong avec ${game.player2.displayName}`;
            if (game.player2.image) image = game.player2.image;
          }

          this.showNotification({
            title: 'Pong',
            image,
            content: message,
            actions: [
              {
                label: 'Jouer',
                icon: 'sports_esports',
                action: () => {
                  this.router.navigate(['/games/pong', game._id]);
                },
              },
            ],
          });
          this.showSystemNotification(message, undefined, () => {
            this.router.navigate(['/games/pong', game._id]);
          });
        });
      }
    });

    // Notification de test
    // this.showNotification(
    //   {
    //     title: 'Bienvenue',
    //     content: 'Bienvenue sur Ma Météo !',
    //     icon: 'waving_hand',
    //     actions: [
    //       {
    //         label: 'Découvrir',
    //         icon: 'explore',
    //         action: () => {
    //           this.router.navigate(['/']);
    //         },
    //       },
    //     ],
    //   },
    //   10000000
    // );
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

  isDocumentCurrentlyVisible(): boolean {
    return typeof document !== 'undefined'
      ? !document.hidden && document.hasFocus()
      : true;
  }

  showNotification(
    data: NotificationData,
    duration: number = 5000,
    horizontalPosition: MatSnackBarHorizontalPosition = 'start',
    verticalPosition: MatSnackBarVerticalPosition = 'bottom'
  ) {
    this.snackBar.openFromComponent(NotificationComponent, {
      data,
      duration,
      horizontalPosition,
      verticalPosition,
    });
  }

  showSystemNotification(
    message: string,
    image?: string,
    action?: () => void,
    doNotNotifyIfVisible: boolean = true
  ) {
    if (!('Notification' in window)) {
      console.error('Ce navigateur ne supporte pas les notifications système.');
      return;
    }

    if (doNotNotifyIfVisible && this.isDocumentCurrentlyVisible()) {
      console.info('La notification système a été annulée (page visible).');
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
