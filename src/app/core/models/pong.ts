import { User } from './user';

export type Position = { x: number; y: number };

export interface Pong {
  _id: string;
  player1: User;
  player2?: User | null;
  player1RacketPosition: Position;
  player1RacketVelocity: number;
  player2RacketPosition: Position;
  player2RacketVelocity: number;
  ballPosition: Position;
  ballVx: number;
  ballVy: number;
  ballVelocity: number;
  isPaused: boolean;
  pausedBy?: 1 | 2;
  winner?: 1 | 2;
  isFinished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  _v?: number;
}

export const fieldSize = { x: 200, y: 150 };
export const racketWidth = 5;
export const racketHeight = 30;
export const ballRadius = 5;

export interface CreatePongDto {
  player1: User;
  player2: User | null;
}

export interface UpdatePongDto {
  _id: string;
  player: 1 | 2;
  playerRacketPosition: Position;
  playerRacketVelocity: number;
}
