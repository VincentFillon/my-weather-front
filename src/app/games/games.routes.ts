import { Routes } from '@angular/router';
import { GamesComponent } from './games.component';
import { NewGameComponent } from './new-game/new-game.component';
import { TicTacToeComponent } from './tic-tac-toe/tic-tac-toe.component';

export const routes: Routes = [
  {
    path: '',
    component: GamesComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: NewGameComponent,
      },
      {
        path: ':gameId',
        component: TicTacToeComponent,
      },
    ],
  },
];
