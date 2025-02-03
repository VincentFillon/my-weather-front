import { User } from './user';

export type TicTacToeValue = '' | 'X' | 'O';

export interface TicTacToe {
  _id: string;
  playerX: User;
  playerO?: User | null;
  grid: TicTacToeValue[];
  turn: number;
  winner?: TicTacToeValue;
  isFinished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  _v?: number;
}

export interface PlayerGames {
  nb: number;
  games: TicTacToe[];
}

export interface TicTacToePlayer {
  _id: string;
  player: User;
  wins: PlayerGames;
  draws: PlayerGames;
  losses: PlayerGames;
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
