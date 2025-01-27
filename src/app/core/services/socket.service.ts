import { Injectable } from '@angular/core';

import { Observable, Subject, catchError, of, share } from 'rxjs';
import { ManagerOptions, Socket, SocketOptions, io } from 'socket.io-client';

import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export interface SocketIoConfig {
  url: string;
  options?: Partial<ManagerOptions & SocketOptions>;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  /** Permet de déterminer si le navigateur supporte l'utilisation de WebSockets */
  private BROWSER_SUPPORTS_WEBSOCKETS: boolean;

  /** Nombre d'observable enregistrés sur chaque événement de la socket active */
  private subscribersCounter: Record<string, number> = {};
  /** Liste des observables enregistrés sur chaque événement de la socket active */
  private eventObservables$: Record<string, Observable<any>> = {};

  /** Socket active */
  private socket?: Socket;

  /** Etat de connexion de la socket active */
  private _connected: boolean;
  /** Etat de connexion de la socket active (sous forme de {@link Subject.create Subject}) */
  connectedStatus: Subject<boolean> = new Subject<boolean>();

  constructor(private authService: AuthService, private router: Router) {
    // Vérifier si le navigateur supporte l'utilisation de WebSockets
    this.BROWSER_SUPPORTS_WEBSOCKETS = !!(
      'WebSocket' in window || 'MozWebSocket' in window
    );
    this._connected = false;
  }

  get connected(): boolean {
    return this._connected;
  }

  set connected(value) {
    this._connected = value;
    this.connectedStatus.next(value);
  }

  /**
   * Permet de savoir si la socket est instancée et connecté au serveur
   * @returns {boolean} etat de connexion de la socket
   */
  public isConnected(): boolean {
    return !!(this.socket != null && this.connected);
  }

  /**
   * Initialisation de la WebSocket (configuration et connexion initiale).
   * @remark Nouvelle tentative de connexion automatique toutes les 5sec en cas d'échec jusqu'à ce que la connexion soit réussie
   * @param token Token JWT de l'utilisateur connecté
   * @returns Retourne `Observable<false>` après chaque tentative échouée de connexion. Retourne `Observable<true>` une fois la connexion réussie.
   */
  public initSocket(token: string) {
    // Si jamais une socket était déjà connectée : on supprime tous les listeners enregistrés et on déconnecte la socket
    this.removeAllListeners();
    this.disconnect();

    const { protocol, hostname, port } = window.location;
    const wsUrl = `${/* environment.production ? 'wss' : 'ws' */protocol}//${hostname}${port ? `:${port}` : ''}`;
    console.debug(wsUrl);


    return (
      new Observable<boolean>((subscribe) => {
        // Si le navigateur est compatible et qu'on a bien un utilisateur connecté
        if (this.BROWSER_SUPPORTS_WEBSOCKETS && token) {
          // Configuration de la WebSocket
          const config: SocketIoConfig = {
            url: wsUrl,
            options: {
              path: '/api',
              // transports: ['websocket'],
              reconnection: true,
              reconnectionAttempts: Infinity,
              reconnectionDelay: 5000,
              reconnectionDelayMax: 10000,
              randomizationFactor: 0.1,
              timeout: 5000,
              transportOptions: {
                polling: {
                  extraHeaders: {
                    Authorization: token, // `Bearer ${token}`,
                  },
                },
              },
            },
          };

          // Ouverture de la connexion avec la socket
          this.socket = io(config.url, config.options);

          // Erreur de connexion (socket)
          this.socket.on('connect_error', (err: Error) => {
            this.connected = false;
            console.error('[WebSocket] "connect_error" - ', err);
            subscribe.error(err);
          });

          // Erreur de connexion (IO)
          this.socket.on('error', (err: any) => {
            this.connected = false;
            console.error('[WebSocket] "error" - ', err);
            subscribe.error(err);
          });

          // Exception
          this.socket.on('exception', (err: any) => {
            console.error('[WebSocket] "exception" - ', err);

            if (err.status === 'error' && err.message === 'Unauthorized') {
              this.removeAllListeners();
              this.disconnect();
              console.warn('[SocketService] token expiré ou invalide : déconnexion');
              this.authService.logout();
            }
          });

          // Connexion réussie
          this.socket.on('connect', () => {
            this.connected = true;
            console.info(
              `[WebSocket] Connecté à la socket [${this.socket!.id}]`
            );

            subscribe.next(true);
            subscribe.complete();
          });
        } else if (!this.BROWSER_SUPPORTS_WEBSOCKETS) {
          // Si le navigateur ne supporte pas l'utilisation de WebSockets : on arrête les tentatives de connexion et on supprime tous les listener enregistrés
          subscribe.next(false);
          this.removeAllListeners();
          this.disconnect();
          subscribe.complete();
          // De plus : on throw une exception pour notifier à l'utilisateur qu'il y a un problème d'incompatibilité avec son navigateur
          throw new Error(
            `Votre navigateur n'est pas compatible avec la technologie des WebSocket (nécéssaire pour l'utilisation de la messagerie)`
          );
        } else {
          console.warn('[WebSocket] utilisateur non connecté');
          subscribe.next(false);
        }
      })
        // On catch les erreurs pour retourner un `Observable<false>` et ne pas déclencher
        // la methode 'error' du Subscriber (pour pouvoir retry indéfiniment jusqu'à la réussite de la connexion)
        .pipe(catchError(() => of(false)))
    );
  }

  /**
   * Connecter manuellement la socket
   * @remark Normalement on aura jamais besoin d'utiliser cette methode (cf. {@link SocketService.initSocket} pour la connexion)
   */
  connect() {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }
    console.info(`[WebSocket] Connexion à la WebSocket [${this.socket.id}]`);
    this.socket.connect();
  }

  /**
   * Déconnecter manuellement la socket. La socket n'essaiera pas de se reconnecter.
   */
  disconnect() {
    this.connected = false;
    if (this.socket != null) {
      console.info(
        `[WebSocket] Déconnexion de la WebSocket [${this.socket.id}]`
      );
      this.socket.disconnect();
    }
  }

  /**
   * Permet d'enregistrer un listener sur la socket active
   * @param ev Nom de l'événement sur lequel enregistrer le listener
   * @param listener Listener à enregistrer
   */
  on(ev: string, listener: (...args: any[]) => void) {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }
    // console.debug(`[WebSocket] Ajout d'un listener sur l'événement '${ev}'`);
    this.socket.on(ev, listener);
  }

  /**
   * Permet d'enregistrer un listener à usage unique (l'enregistrement du listener sera supprimé dès que l'événement aura eu lieu une fois) sur la socket active
   * @param ev Nom de l'événement sur lequel enregistrer le listener
   * @param listener Listener à enregistrer
   */
  once(ev: string, listener: (...args: any[]) => void) {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }
    // console.debug(`[WebSocket] Ajout d'un listener à usage unique (one-time) sur l'événement '${ev}'`);
    this.socket.once(ev, listener);
  }

  /**
   * Permet d'émettre un événement sur la socket active
   * @param ev Nom de l'événement à émettre
   * @param params (optionnel) Paramètres à envoyer au serveur
   * @param timeout (optionnel) [default: 0] Décalle l'émission de l'événement du nombre de secondes données
   * @param volatile (optionnel) [default: false] Rend l'émission de l'événément "volatile" ce qui signifie que si le serveur n'était pas prêt à
   * recevoir de message au moment de l'envoi alors le message sera tout simplement ignoré
   */
  emit(ev: string, params: any, timeout = 0, volatile = false) {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }
    // console.debug(`[WebSocket] Emission de l'événement '${ev}'${params ? '. Params :' : ''}`);
    // if (params) {
    //   console.debug(params);
    // }
    let socket = this.socket;
    if (timeout > 0) {
      socket = socket.timeout(timeout);
    }
    if (volatile) {
      socket = socket.volatile;
    }
    socket.emit(ev, params);
  }

  /**
   * Supprimer l'enregistrement d'un listener sur la socket active
   * @param ev Nom de l'événement auquel est rattaché le listener
   * @param listener Listener à supprimer
   */
  removeListener(
    ev?: string,
    listener?: ((...args: any[]) => void) | undefined
  ) {
    if (this.socket) {
      // console.debug(`[WebSocket] Retrait d'un listener${ev ? "sur l'événement '" + ev + "'" : ''}`);
      this.socket.removeListener(ev, listener);
    }
  }

  /**
   * Supprimer tous les listener sur la socket active
   * @param ev (optionnel) Nom de l'événement sur lequel supprimer tous les listener.
   * Si ce paramètre n'est pas fourni, supprime tous les listener sur tous les événéments de la socket
   */
  removeAllListeners(ev?: string) {
    if (this.socket) {
      // console.debug(`[WebSocket] Retrait de tous les listeners${ev ? "sur l'événement '" + ev + "'" : ''}`);
      this.socket.removeAllListeners(ev);
    }
  }

  /**
   * Permet d'enregistrer un `Observable<T>` sur un événement de la socket active.
   * Plus flexible qu'un simple listener: permet d'utiliser les fonctionnalités RxJS sur le listener
   * @param ev Nom de l'événement sur lequel enregistrer le listener
   * @returns `Observable<T>` qui emettra un `next(T)` à chaque fois que le serveur emettra l'événement `ev`
   * @remark **Attention** : l'observable retourné ne se complete jamais, il faut penser à `unsubscribe()`
   */
  fromEvent<T>(ev: string): Observable<T> {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }

    if (!this.subscribersCounter[ev]) {
      this.subscribersCounter[ev] = 0;
    }
    this.subscribersCounter[ev]++;

    if (!this.eventObservables$[ev]) {
      // console.debug(`[WebSocket] Ajout d'un observable sur l'événement '${ev}'`);

      this.eventObservables$[ev] = new Observable((subscribe) => {
        const listener = (data: T) => {
          subscribe.next(data);
        };
        if (!this.socket) {
          throw new Error(
            `La connexion à la WebSocket n'a pas encore été établie`
          );
        }
        this.socket.on(ev, listener);
        return () => {
          this.subscribersCounter[ev]--;
          if (this.subscribersCounter[ev] === 0) {
            if (this.socket) {
              this.socket.removeListener(ev, listener);
            }
            delete this.eventObservables$[ev];
          }
        };
      }).pipe(share());
    }
    return this.eventObservables$[ev];
  }

  /**
   * Permet d'enregistrer un listener à usage unique (voir {@link SocketService.once}) sur un événement de la socket active mais de transformer le listener en `Promise<T>`.
   * Plus flexible qu'un simple listener: permet d'utiliser les fonctionnalités asynchrone de Javascipt
   * @param ev Nom de l'événement sur lequel enregistrer le listener
   * @returns `Promise<T>` qui retournera une valeur (T) la première fois que le serveur emettra l'événement `ev`
   */
  fromOneTimeEvent<T>(ev: string): Promise<T> {
    return new Promise<T>((resolve) => this.once(ev, resolve));
  }

  /**
   * Permet de lister les listener enregistrés sur un événement donnée de la socket active
   * @param event Nom de l'événement sur lequel récupérer les listeners enregistrés
   * @returns Liste des listeners enregistrés
   */
  listeners(event: string) {
    if (this.socket) {
      return this.socket.listeners(event);
    }
    return [];
  }

  /**
   * Permet de lister les listener enregistrés sans événement donnée (any) sur la socket active
   * @returns Liste des listeners enregistrés.
   * @remark **Attention** : manipuler la liste retournée agit directement sur l'enregistrement de ces listener
   */
  listenersAny() {
    if (this.socket) {
      return this.socket.listenersAny();
    }
    return [];
  }

  /**
   * Permet de lister les listener enregistrés sans événement donnée (any) sur la socket active
   * @returns Liste des listeners enregistrés.
   * @remark **Attention** : manipuler la liste retournée agit directement sur l'enregistrement de ces listener
   */
  listenersAnyOutgoing() {
    if (this.socket) {
      return this.socket.listenersAnyOutgoing();
    }
    return [];
  }

  /**
   * Permet de supprimer l'enregistrement d'un listener sur un événement donné de la socket active
   * @param ev (optionnel) Nom de l'événement sur lequel supprimer l'enregistrement du listener
   * @param listener Listener à supprimer
   * @remark Si le paramètre `ev` est omis, supprime le listener de ceux enregistrés sans événement donné (any)
   */
  off(ev?: string, listener?: ((...args: any[]) => void) | undefined) {
    if (!this.socket) {
      return this.socket;
    }
    if (!ev) {
      // Remove all listeners for all events
      return this.socket.offAny();
    }

    // Removes the specified listener from the listener array for the event named
    return this.socket.off(ev, listener);
  }

  /**
   * Permet d'enregistrement un listener sans événement donné (any) sur la socket active
   * @param listener Listener à supprimer
   * @remark Le 1er paramètre du listener sera le nom de l'événement qui l'a déclenché
   */
  onAny(listener: (event: string, ...args: any[]) => void) {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }
    return this.socket.onAny(listener);
  }

  /**
   * Permet d'enregistrement un listener sans événement donné (any) sur la socket active
   * @param listener Listener à supprimer
   * @remark Le 1er paramètre du listener sera le nom de l'événement qui l'a déclenché
   */
  onAnyOutgoing(listener: (event: string, ...args: any[]) => void) {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }
    return this.socket.onAnyOutgoing(listener);
  }

  /**
   * Permet d'enregistrement un listener sans événement donné (any) sur la socket active.
   * Ce listener sera déclenché en priorité par rapport aux autres listeners enregistrés (il sera en 1er dans la liste au moment de son enregistrement)
   * @param listener Listener à supprimer
   * @remark Le 1er paramètre du listener sera le nom de l'événement qui l'a déclenché
   */
  prependAny(listener: (event: string, ...args: any[]) => void) {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }
    return this.socket.prependAny(listener);
  }

  /**
   * Permet d'enregistrement un listener sans événement donné (any) sur la socket active.
   * Ce listener sera déclenché en priorité par rapport aux autres listeners enregistrés (il sera en 1er dans la liste au moment de son enregistrement)
   * @param listener Listener à supprimer
   * @remark Le 1er paramètre du listener sera le nom de l'événement qui l'a déclenché
   */
  prependAnyOutgoing(
    listener: (event: string | symbol, ...args: any[]) => void
  ) {
    if (!this.socket) {
      throw new Error(`La connexion à la WebSocket n'a pas encore été établie`);
    }
    return this.socket.prependAnyOutgoing(listener);
  }
}
