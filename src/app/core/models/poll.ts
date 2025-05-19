import { User } from './user';

export interface Poll {
  _id: string;

  title: string;

  description?: string;

  options: PollOption[];

  endDate: Date; // La date et heure de fin du sondage

  multipleChoice: boolean; // true: l'utilisateur peut choisir plusieurs options, false: une seule option

  creator: User;

  createdAt: Date;
  updatedAt: Date;
}

export interface PollOption {
  _id: string;

  text: string;
}

export interface UserVote {
  _id: string;
  poll: Poll;
  user: User;
  selectedOptions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePollDto {
  title: string;

  description?: string;

  options: { _id?: string; text: string }[];

  endDate: Date; // La date et heure de fin du sondage

  multipleChoice: boolean; // true: l'utilisateur peut choisir plusieurs options, false: une seule option
}

export interface UpdatePollDto extends Partial<CreatePollDto> {
  _id: string;
}

export interface UserVoteDto {
  pollId: string;
  selectedOptions: string[];
}

type SortOrder = 1 | -1 | 'asc' | 'ascending' | 'desc' | 'descending';

export interface SearchPollDto {
  pollId?: string;
  pollIds?: string[];
  creatorId?: string;
  term?: string;
  createdFrom?: Date;
  createdTo?: Date;
  ended?: boolean;
  endFrom?: Date;
  endTo?: Date;
  sort?: string;
  order?: SortOrder;
  limit?: number;
  skip?: number;
}
