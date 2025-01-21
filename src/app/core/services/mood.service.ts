import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateMoodDto, Mood, UpdateMoodDto } from '../models/mood';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class MoodService {
  private socketService = inject(SocketService);

  private moodsObserver?: Observable<Mood[]>;
  private moodObserver?: Observable<Mood>;
  private moodCreatedObserver?: Observable<Mood>;
  private moodUpdatedObserver?: Observable<Mood>;
  private moodRemovedObserver?: Observable<string>;

  // Méthodes pour les moods
  public createMood(mood: CreateMoodDto): void {
    this.socketService.emit('createMood', mood);
  }

  public findAllMoods(): Observable<Mood[]> {
    if (!this.moodsObserver) {
      this.moodsObserver = this.socketService.fromEvent<Mood[]>('moodsFound');
    }
    this.socketService.emit('findAllMood', {});
    return this.moodsObserver;
  }

  public findOneMood(_id: string): Observable<Mood> {
    if (!this.moodObserver) {
      this.moodObserver = this.socketService.fromEvent<Mood>('moodFound');
    }
    this.socketService.emit('findOneMood', { _id });
    return this.moodObserver;
  }

  public updateMood(mood: UpdateMoodDto): void {
    this.socketService.emit('updateMood', mood);
  }

  public removeMood(id: string): void {
    this.socketService.emit('removeMood', id);
  }

  public onMoodCreated(): Observable<Mood> {
    if (!this.moodCreatedObserver) {
      this.moodCreatedObserver =
        this.socketService.fromEvent<Mood>('moodCreated');
    }
    console.debug('[WebSocket] subscribed to "moodCreated" event');
    return this.moodCreatedObserver;
  }

  public onMoodUpdated(): Observable<Mood> {
    if (!this.moodUpdatedObserver) {
      this.moodUpdatedObserver =
        this.socketService.fromEvent<Mood>('moodUpdated');
    }
    console.debug('[WebSocket] subscribed to "moodUpdated" event');
    return this.moodUpdatedObserver;
  }

  public onMoodRemoved(): Observable<string> {
    if (!this.moodRemovedObserver) {
      this.moodRemovedObserver =
        this.socketService.fromEvent<string>('moodRemoved');
    }
    console.debug('[WebSocket] subscribed to "moodRemoved" event');
    return this.moodRemovedObserver;
  }
}
