import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUserDto, UpdateUserDto, User } from '../models/user';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private socketService = inject(SocketService);

  private usersObserver?: Observable<User[]>;
  private userObserver?: Observable<User>;
  private userCreatedObserver?: Observable<User>;
  private userUpdatedObserver?: Observable<User>;
  private userMoodUpdatedObserver?: Observable<User>;
  private userRemovedObserver?: Observable<string>;

  // Méthodes pour les users
  public createUser(user: CreateUserDto): void {
    this.socketService.emit('createUser', user);
  }

  public findAllUsers(): Observable<User[]> {
    if (!this.usersObserver) {
      this.usersObserver = this.socketService.fromEvent<User[]>('usersFound');
    }
    this.socketService.emit('findAllUser', {});
    return this.usersObserver;
  }

  public findOneUser(_id: string): Observable<User> {
    if (!this.userObserver) {
      this.userObserver = this.socketService.fromEvent<User>('userFound');
    }
    this.socketService.emit('findOneUser', { _id });
    return this.userObserver;
  }

  public updateUser(user: UpdateUserDto): void {
    this.socketService.emit('updateUser', user);
  }

  public updateUserMood(userId: string, moodId: string | null): void {
    this.socketService.emit('updateUserMood', {
      _id: userId,
      mood: moodId === null ? null : { _id: moodId },
    });
  }

  public removeUser(id: string): void {
    this.socketService.emit('removeUser', id);
  }

  public onUserCreated(): Observable<User> {
    if (!this.userCreatedObserver) {
      this.userCreatedObserver =
        this.socketService.fromEvent<User>('userCreated');
    }
    console.debug('[WebSocket] subscribed to "userCreated" event');
    return this.userCreatedObserver;
  }

  public onUserUpdated(): Observable<User> {
    if (!this.userUpdatedObserver) {
      this.userUpdatedObserver =
        this.socketService.fromEvent<User>('userUpdated');
    }
    console.debug('[WebSocket] subscribed to "userUpdated" event');
    return this.userUpdatedObserver;
  }

  public onUserMoodUpdated(): Observable<User> {
    if (!this.userMoodUpdatedObserver) {
      this.userMoodUpdatedObserver =
        this.socketService.fromEvent<User>('userMoodUpdated');
    }
    console.debug('[WebSocket] subscribed to "userMoodUpdated" event');
    return this.userMoodUpdatedObserver;
  }

  public onUserRemoved(): Observable<string> {
    if (!this.userRemovedObserver) {
      this.userRemovedObserver =
        this.socketService.fromEvent<string>('userRemoved');
    }
    console.debug('[WebSocket] subscribed to "userRemoved" event');
    return this.userRemovedObserver;
  }
}
