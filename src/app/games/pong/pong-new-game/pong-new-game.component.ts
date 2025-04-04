import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { filter, finalize, Subscription } from 'rxjs';
import { Pong } from '../../../core/models/pong';
import { User } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth.service';
import { PongService } from '../../../core/services/pong.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-pong-new-game',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './pong-new-game.component.html',
  styleUrl: './pong-new-game.component.scss',
})
export class PongNewGameComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private pongService = inject(PongService);
  private router = inject(Router);

  private userSubscription?: Subscription;
  private usersSubscriptions: Subscription[] = [];

  private user: User | null = null;

  users: User[] = [];
  private usersTimeout: any;

  newGameForm = new FormGroup({
    player2: new FormControl<User | null>(null),
  });
  showNewGameForm = false;

  ngOnInit() {
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });

    // S'abonner aux mises à jour des utilisateurs
    this.usersSubscriptions.push(
      this.userService.findAllUsers().subscribe((users) => {
        this.setUsers(users);
      })
    );
    this.usersSubscriptions.push(
      this.userService.onUserUpdated().subscribe((user) => {
        this.setUsers(this.users.map((u) => (u._id === user._id ? user : u)));
      })
    );
    this.usersSubscriptions.push(
      this.userService.onUserCreated().subscribe((user) => {
        this.setUsers([...this.users, user]);
      })
    );
    this.usersSubscriptions.push(
      this.userService.onUserRemoved().subscribe((userId) => {
        this.setUsers(this.users.filter((u) => u._id !== userId));
      })
    );
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.usersSubscriptions.forEach((sub) => sub.unsubscribe());
  }

  private setUsers(users: User[]) {
    if (this.usersTimeout) {
      clearTimeout(this.usersTimeout);
    }
    this.usersTimeout = setTimeout(() => {
      this.users = users.filter((u) => u._id !== this.user?._id);
    }, 150);
  }

  startNewGame() {
    this.showNewGameForm = true;
  }

  onStartNewGame() {
    if (this.user) {
      const gameCreatedSubscription = this.pongService
        .onPongCreated()
        .pipe(
          // On vérifie si l'utilisateur est concerné par la partie
          filter(
            (pong) =>
              this.user?._id === pong.player1._id ||
              this.user?._id === pong.player2?._id
          )
        )
        .pipe(finalize(() => gameCreatedSubscription.unsubscribe()))
        .subscribe((game: Pong) => {
          this.router.navigate([`/games/pong/${game._id}`]);
        });
      let player2: User | null = null;
      if (this.newGameForm.value.player2 && this.newGameForm.value.player2._id)
        player2 = this.newGameForm.value.player2;
      console.debug(player2);
      this.pongService.create({ player1: this.user, player2 });
      this.showNewGameForm = false;
    }
  }
}
