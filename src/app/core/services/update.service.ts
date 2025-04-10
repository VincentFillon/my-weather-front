import { ApplicationRef, inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SwUpdate,
  UnrecoverableStateEvent,
  VersionReadyEvent,
} from '@angular/service-worker';
import { concat, first, interval } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private swUpdate = inject(SwUpdate);
  private snackBar = inject(MatSnackBar); // Utilise ton service si tu préfères
  private appRef = inject(ApplicationRef); // Pour vérifier la stabilité de l'app

  constructor() {
    // Vérifier périodiquement les mises à jour une fois l'application stable
    this.setupPeriodicUpdateCheck();
  }

  /**
   * Initialise l'écoute des mises à jour disponibles.
   * À appeler tôt dans le cycle de vie de l'application (ex: AppComponent.ngOnInit).
   */
  public initUpdateListener(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker is disabled.');
      return;
    }
    console.log('App Update Service: Listening for updates...');

    // Écouter l'événement indiquant qu'une nouvelle version est téléchargée et prête
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe((evt) => {
        console.log(
          `Update available: New version ${evt.latestVersion.hash} ready.`
        );
        this.showUpdateNotification();
      });

    // Gérer les cas où le service worker est dans un état irrécupérable
    this.swUpdate.unrecoverable.subscribe((event: UnrecoverableStateEvent) => {
      console.error(
        `Unrecoverable Service Worker error detected: ${event.reason}`
      );
      this.notifyUserAboutUnrecoverableState(event.reason);
    });
  }

  private setupPeriodicUpdateCheck(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // Attendre que l'application soit stable pour la première fois
    const appIsStable$ = this.appRef.isStable.pipe(
      first((isStable) => isStable === true)
    );

    // Créer un intervalle
    const everyTwoHours$ = interval(30 * 60 * 1000); // 30min (en millisecondes)

    // Concaténer : attendre la stabilité, puis lancer l'intervalle
    const periodicCheck$ = concat(appIsStable$, everyTwoHours$);

    periodicCheck$.subscribe(() => {
      console.log('Checking for app update...');
      this.swUpdate
        .checkForUpdate()
        .then((updateFound) => {
          console.log(
            updateFound
              ? 'Update check found a new version.'
              : 'Update check found no new version.'
          );
        })
        .catch((err) => {
          console.error('Error during update check:', err);
        });
    });
  }

  private showUpdateNotification(): void {
    // Utilise MatSnackBar ou ton composant de notification personnalisé
    const snackBarRef = this.snackBar.open(
      'Une nouvelle version est disponible !', // Message
      'METTRE À JOUR', // Label du bouton d'action
      { duration: undefined } // Reste ouvert jusqu'à action ou fermeture manuelle
    );

    // Quand l'utilisateur clique sur le bouton d'action
    snackBarRef.onAction().subscribe(() => {
      this.activateUpdate();
    });
  }

  private activateUpdate(): void {
    console.log('Activating the new version...');
    // Demande au Service Worker d'activer la nouvelle version
    this.swUpdate
      .activateUpdate()
      .then((activated) => {
        if (activated) {
          console.log('New version activated. Reloading page...');
          // Recharge la page pour utiliser la nouvelle version
          document.location.reload();
        } else {
          console.log('Update activation did not complete.');
        }
      })
      .catch((err) => {
        console.error('Failed to activate update:', err);
      });
  }

  private notifyUserAboutUnrecoverableState(reason: string): void {
    const snackBarRef = this.snackBar.open(
      `Erreur critique de l'application: ${reason}. Veuillez recharger la page.`,
      'Recharger',
      { duration: undefined }
    );
    snackBarRef.onAction().subscribe(() => {
      document.location.reload();
    });
  }
}
