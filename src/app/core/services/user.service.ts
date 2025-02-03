import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUserDto, UpdateUserDto, User } from '../models/user';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private socketService = inject(SocketService);

  private users$?: Observable<User[]>;
  private user$?: Observable<User>;
  private userCreated$?: Observable<User>;
  private userUpdated$?: Observable<User>;
  private userMoodUpdated$?: Observable<User>;
  private userRemoved$?: Observable<string>;

  // Méthodes pour les users
  public createUser(user: CreateUserDto): void {
    this.socketService.emit('createUser', user);
  }

  public findAllUsers(): Observable<User[]> {
    if (!this.users$) {
      this.users$ = this.socketService.fromEvent<User[]>('usersFound');
    }
    this.socketService.emit('findAllUser', {});
    return this.users$;
  }

  public findOneUser(_id: string): Observable<User> {
    if (!this.user$) {
      this.user$ = this.socketService.fromEvent<User>('userFound');
    }
    this.socketService.emit('findOneUser', { _id });
    return this.user$;
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
    if (!this.userCreated$) {
      this.userCreated$ =
        this.socketService.fromEvent<User>('userCreated');
    }
    // console.debug('[WebSocket] subscribed to "userCreated" event');
    return this.userCreated$;
  }

  public onUserUpdated(): Observable<User> {
    if (!this.userUpdated$) {
      this.userUpdated$ =
        this.socketService.fromEvent<User>('userUpdated');
    }
    // console.debug('[WebSocket] subscribed to "userUpdated" event');
    return this.userUpdated$;
  }

  public onUserMoodUpdated(): Observable<User> {
    if (!this.userMoodUpdated$) {
      this.userMoodUpdated$ =
        this.socketService.fromEvent<User>('userMoodUpdated');
    }
    // console.debug('[WebSocket] subscribed to "userMoodUpdated" event');
    return this.userMoodUpdated$;
  }

  public onUserRemoved(): Observable<string> {
    if (!this.userRemoved$) {
      this.userRemoved$ =
        this.socketService.fromEvent<string>('userRemoved');
    }
    // console.debug('[WebSocket] subscribed to "userRemoved" event');
    return this.userRemoved$;
  }
}
