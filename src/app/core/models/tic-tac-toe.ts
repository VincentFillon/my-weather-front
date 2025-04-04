import { User } from './user';

export type TicTacToeValue = '' | 'X' | 'O';

export interface TicTacToe {
  _id: string;
  playerX: User;
  playerO?: User | null;
  grid: TicTacToeValue[];
  firstPlayer: 'X' | 'O';
  turn: number;
  winner?: TicTacToeValue;
  isFinished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  _v?: number;
}

export interface TicTacToePlayerGames {
  nb: number;
  games: TicTacToe[];
}

export interface TicTacToePlayer {
  _id: string;
  player: User;
  wins: TicTacToePlayerGames;
  draws: TicTacToePlayerGames;
  losses: TicTacToePlayerGames;
  createdAt?: Date;
  updatedAt?: Date;
  _v?: number;
}

export interface CreateTicTacToeDto {
  playerX: User;
  playerO: User | null;
}

export interface UpdateTicTacToeDto {
  _id: string;
  player: 'X' | 'O';
  index: number;
}
