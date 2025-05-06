import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreatePollDto,
  Poll,
  SearchPollDto,
  UpdatePollDto,
  UserVote,
  UserVoteDto,
} from '../models/poll';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class PollService {
  private socketService = inject(SocketService);
  private http = inject(HttpClient);

  private apiUrl = '/api/poll';

  private pollsObserver$?: Observable<Poll[]>;
  private pollsSearchObserver$?: Observable<Poll[]>;
  private pollObserver$?: Observable<Poll>;
  private pollCreatedObserver$?: Observable<Poll>;
  private pollUpdatedObserver$?: Observable<Poll>;
  private pollVotesObserver$?: Observable<{
    pollId: string;
    userVotes: UserVote[];
  }>;
  private userVotedObserver$?: Observable<{
    pollId: string;
    userVote: UserVote;
  }>;
  private pollRemovedObserver$?: Observable<string>;

  // Méthodes pour les polls
  public createPoll(poll: CreatePollDto): void {
    this.socketService.emit('createPoll', poll);
  }

  public findAllPolls(): Observable<Poll[]> {
    if (!this.pollsObserver$) {
      this.pollsObserver$ = this.socketService.fromEvent<Poll[]>('pollsFound');
    }
    this.socketService.emit('findAllPoll', {});
    return this.pollsObserver$;
  }

  public searchPolls(filters: SearchPollDto): Observable<Poll[]> {
    if (!this.pollsSearchObserver$) {
      this.pollsSearchObserver$ =
        this.socketService.fromEvent<Poll[]>('pollsSearchFound');
    }
    this.socketService.emit('searchPolls', filters);
    return this.pollsSearchObserver$;
  }

  public findOnePoll(_id: string): Observable<Poll> {
    if (!this.pollObserver$) {
      this.pollObserver$ = this.socketService.fromEvent<Poll>('pollFound');
    }
    this.socketService.emit('findOnePoll', _id);
    return this.pollObserver$;
  }

  public updatePoll(poll: UpdatePollDto): void {
    this.socketService.emit('updatePoll', poll);
  }

  public findPollVotes(
    pollId: string
  ): Observable<{ pollId: string; userVotes: UserVote[] }> {
    if (!this.pollVotesObserver$) {
      this.pollVotesObserver$ = this.socketService.fromEvent<{
        pollId: string;
        userVotes: UserVote[];
      }>('pollVotes');
    }
    this.socketService.emit('findPollVotes', pollId);
    return this.pollVotesObserver$;
  }

  public userVote(userVote: UserVoteDto): void {
    this.socketService.emit('userVote', userVote);
  }

  public removePoll(id: string): void {
    this.socketService.emit('removePoll', id);
  }

  public onPollCreated(): Observable<Poll> {
    if (!this.pollCreatedObserver$) {
      this.pollCreatedObserver$ =
        this.socketService.fromEvent<Poll>('pollCreated');
    }
    // console.debug('[WebSocket] subscribed to "pollCreated" event');
    return this.pollCreatedObserver$;
  }

  public onPollUpdated(): Observable<Poll> {
    if (!this.pollUpdatedObserver$) {
      this.pollUpdatedObserver$ =
        this.socketService.fromEvent<Poll>('pollUpdated');
    }
    // console.debug('[WebSocket] subscribed to "pollUpdated" event');
    return this.pollUpdatedObserver$;
  }

  public onUserVoted(): Observable<{ pollId: string; userVote: UserVote }> {
    if (!this.userVotedObserver$) {
      this.userVotedObserver$ = this.socketService.fromEvent<{
        pollId: string;
        userVote: UserVote;
      }>('userVoted');
    }
    // console.debug('[WebSocket] subscribed to "userVoted" event');
    return this.userVotedObserver$;
  }

  public onPollRemoved(): Observable<string> {
    if (!this.pollRemovedObserver$) {
      this.pollRemovedObserver$ =
        this.socketService.fromEvent<string>('pollRemoved');
    }
    // console.debug('[WebSocket] subscribed to "pollRemoved" event');
    return this.pollRemovedObserver$;
  }
}
