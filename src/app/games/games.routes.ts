import { Routes } from '@angular/router';
import { GameSelectionComponent } from './game-selection/game-selection.component';
import { GamesComponent } from './games.component';
import { PongGameComponent } from './pong/pong-game/pong-game.component';
import { PongNewGameComponent } from './pong/pong-new-game/pong-new-game.component';
import { PongComponent } from './pong/pong.component';
import { TicTacToeGameComponent } from './tic-tac-toe/tic-tac-toe-game/tic-tac-toe-game.component';
import { TicTacToeNewGameComponent } from './tic-tac-toe/tic-tac-toe-new-game/tic-tac-toe-new-game.component';
import { TicTacToeComponent } from './tic-tac-toe/tic-tac-toe.component';

export const routes: Routes = [
  {
    path: '',
    component: GamesComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: GameSelectionComponent,
      },
      {
        path: 'tic-tac-toe',
        component: TicTacToeComponent,
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: TicTacToeNewGameComponent,
          },
          {
            path: ':gameId',
            component: TicTacToeGameComponent,
          },
        ],
      },
      {
        path: 'pong',
        component: PongComponent,
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: PongNewGameComponent,
          },
          {
            path: ':gameId',
            component: PongGameComponent,
          },
        ],
      },
    ],
  },
];
