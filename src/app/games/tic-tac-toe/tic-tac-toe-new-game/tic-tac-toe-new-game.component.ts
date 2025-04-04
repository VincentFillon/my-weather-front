import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { filter, finalize, Subscription } from 'rxjs';
import { TicTacToe } from '../../../core/models/tic-tac-toe';
import { User } from '../../../core/models/user';
import { AuthService } from '../../../core/services/auth.service';
import { TicTacToeService } from '../../../core/services/tic-tac-toe.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-tic-tac-toe-new-game',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './tic-tac-toe-new-game.component.html',
  styleUrl: './tic-tac-toe-new-game.component.scss',
})
export class TicTacToeNewGameComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private ticTacToeService = inject(TicTacToeService);
  private router = inject(Router);

  private userSubscription?: Subscription;
  private usersSubscriptions: Subscription[] = [];

  private user: User | null = null;

  users: User[] = [];
  private usersTimeout: any;

  newGameForm = new FormGroup({
    playerO: new FormControl<User | null>(null),
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
      const gameCreatedSubscription = this.ticTacToeService
        .onTicTacToeCreated()
        .pipe(
          // On vérifie si l'utilisateur est concerné par la partie
          filter(
            (ticTacToe) =>
              this.user?._id === ticTacToe.playerX._id ||
              this.user?._id === ticTacToe.playerO?._id
          )
        )
        .pipe(finalize(() => gameCreatedSubscription.unsubscribe()))
        .subscribe((game: TicTacToe) => {
          this.router.navigate([`/games/tic-tac-toe/${game._id}`]);
        });
      let playerO: User | null = null;
      if (this.newGameForm.value.playerO && this.newGameForm.value.playerO._id)
        playerO = this.newGameForm.value.playerO;
      console.debug(playerO);
      this.ticTacToeService.create({ playerX: this.user, playerO });
      this.showNewGameForm = false;
    }
  }
}
