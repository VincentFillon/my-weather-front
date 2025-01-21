import { Component, OnDestroy, OnInit, inject } from '@angular/core';

import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Subscription } from 'rxjs';
import { Mood } from '../../core/models/mood';
import { MoodService } from '../../core/services/mood.service';
import { MoodDialogComponent } from './mood-dialog/mood-dialog.component';

@Component({
  selector: 'app-mood-management',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    DragDropModule,
  ],
  templateUrl: './mood-management.component.html',
  styleUrls: ['./mood-management.component.scss'],
})
export class MoodManagementComponent implements OnInit, OnDestroy {
  private moodService = inject(MoodService);
  private dialog = inject(MatDialog);

  moods: Mood[] = [];
  displayedColumns: string[] = ['reorder', 'image', 'name', 'actions'];
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.moodService.findAllMoods().subscribe((moods) => {
        this.moods = moods.sort((a, b) => a.order - b.order);
      })
    );
    this.subscriptions.push(
      this.moodService.onMoodCreated().subscribe((mood) => {
        this.moods = [...this.moods, mood].sort((a, b) => a.order - b.order);
      })
    );
    this.subscriptions.push(
      this.moodService.onMoodRemoved().subscribe((moodId) => {
        this.moods = this.moods.filter((m) => m._id !== moodId);
      })
    );
    this.subscriptions.push(
      this.moodService.onMoodUpdated().subscribe((mood) => {
        this.moods = this.moods
          .map((m) => (m._id === mood._id ? mood : m))
          .sort((a, b) => a.order - b.order);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onAddMood() {
    const dialogRef = this.dialog.open(MoodDialogComponent, {
      width: '400px',
      data: { mode: 'create' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Calculer automatiquement l'ordre pour une nouvelle humeur
        const maxOrder = Math.max(...this.moods.map((m) => m.order), -1);
        this.moodService.createMood({
          ...result,
          order: maxOrder + 1,
        });
      }
    });
  }

  onEditMood(mood: Mood) {
    const dialogRef = this.dialog.open(MoodDialogComponent, {
      width: '400px',
      data: { mode: 'edit', mood },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.moodService.updateMood({
          ...result,
          _id: mood._id,
          order: mood.order, // Conserver l'ordre existant
        });
      }
    });
  }

  onDeleteMood(id: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette humeur ?')) {
      this.moodService.removeMood(id);
    }
  }

  onMoodDrop(event: CdkDragDrop<Mood[]>) {
    if (event.previousIndex === event.currentIndex) return;

    // Mettre à jour l'ordre localement
    const moodsCopy = [...this.moods];
    moveItemInArray(moodsCopy, event.previousIndex, event.currentIndex);

    // Recalculer les ordres pour tous les moods affectés
    const updatedMoods = moodsCopy.map((mood, index) => ({
      ...mood,
      order: index,
    }));

    // Mettre à jour chaque mood affecté dans la base de données
    updatedMoods.forEach((mood) => {
      if (mood.order !== this.moods.find((m) => m._id === mood._id)?.order) {
        this.moodService.updateMood({
          _id: mood._id,
          order: mood.order,
        });
      }
    });
  }
}
