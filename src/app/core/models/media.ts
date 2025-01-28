import { MediaType } from './media-type.enum';

export interface Media {
  _id: string;

  filename: string;

  type: MediaType;

  createdAt?: Date;

  updatedAt?: Date;
}
