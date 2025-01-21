import { Component, inject, OnDestroy, OnInit } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MediaType } from '../../core/models/media-type.enum';
import { MoodService } from '../../core/services/mood.service';
import { UploadService } from '../../core/services/upload.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private moodService = inject(MoodService);
  private userService = inject(UserService);
  private uploadService = inject(UploadService);

  moods: any[] = [];
  users: any[] = [];
  images: any[] = [];
  sounds: any[] = [];
  private subscriptions: Subscription[] = [];

  constructor() {}

  ngOnInit() {
    // S'abonner aux mises à jour des moods
    this.subscriptions.push(
      this.moodService.findAllMoods().subscribe((moods) => {
        this.moods = moods;
      })
    );

    // S'abonner aux mises à jour des utilisateurs
    this.subscriptions.push(
      this.userService.findAllUsers().subscribe((users) => {
        this.users = users;
      })
    );
    // S'abonner aux mises à jour des utilisateurs
    this.subscriptions.push(
      this.uploadService.findAllUploads().subscribe((medias) => {
        this.images = medias.filter((media) => media.type === MediaType.IMAGE);
        this.sounds = medias.filter((media) => media.type === MediaType.SOUND);
      })
    );
    // TODO: Add media files loading when the backend endpoint is available
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
