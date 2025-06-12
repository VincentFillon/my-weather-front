import { Clipboard } from '@angular/cdk/clipboard';

import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Media } from '../../core/models/media';
import { MediaType } from '../../core/models/media-type.enum';
import { UploadService } from '../../core/services/upload.service';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule
],
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss'],
})
export class MediaComponent implements OnInit {
  private uploadService = inject(UploadService);
  private snackBar = inject(MatSnackBar);
  private clipboard = inject(Clipboard);

  images: Media[] = [];
  sounds: Media[] = [];

  constructor() {}

  ngOnInit() {
    this.uploadService.findAllUploads().subscribe((medias) => {
      this.images = medias.filter((media) => media.type === MediaType.IMAGE);
      this.sounds = medias.filter((media) => media.type === MediaType.SOUND);
    });
  }

  uploadImage(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadService.uploadMoodImage(file).subscribe({
        next: (media: Media) => {
          this.snackBar.open('Image téléchargée avec succès', 'Fermer', {
            duration: 3000,
          });
          this.images.push(media);
        },
        error: (error: any) => {
          console.error(error);
          this.snackBar.open(
            "Erreur pendant le téléchargement de l'image",
            'Fermer',
            {
              duration: 3000,
            }
          );
        },
      });
    }
  }

  uploadSound(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadService.uploadMoodSound(file).subscribe({
        next: (media: Media) => {
          this.snackBar.open('Fichier audio téléchargé avec succès', 'Fermer', {
            duration: 3000,
          });
          this.sounds.push(media);
        },
        error: (error: any) => {
          console.error(error);
          this.snackBar.open(
            'Erreur pendant le téléchargement du fichier audio',
            'Fermer',
            {
              duration: 3000,
            }
          );
        },
      });
    }
  }

  copyUrl(url: string) {
    this.clipboard.copy(url);
    this.snackBar.open('URL copiée dans le presse-papier', 'Fermer', {
      duration: 2000,
    });
  }

  removeMedia(media: Media) {
    this.uploadService.removeMedia(media).subscribe({
      next: () => {
        this.snackBar.open('Fichier supprimé avec succès', 'Fermer', {
          duration: 3000,
        });
        this.images = this.images.filter((m) => m._id !== media._id);
        this.sounds = this.sounds.filter((m) => m._id !== media._id);
      },
      error: (error: any) => {
        console.error(error);
        this.snackBar.open(
          'Erreur pendant la suppression du fichier',
          'Fermer',
          { duration: 3000 }
        );
      },
    });
  }
}
