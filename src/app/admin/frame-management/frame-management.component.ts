import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Frame, User } from '../../core/models/user';
import { UserService } from '../../core/services/user.service';
import { FrameDialogComponent } from './frame-dialog/frame-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-frame-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './frame-management.component.html',
  styleUrls: ['./frame-management.component.scss'],
})
export class FrameManagementComponent implements OnInit {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);

  frames: Frame[] = [];
  displayedColumns: string[] = ['image', 'name', 'actions'];

  ngOnInit(): void {
    this.loadFrames();

    this.userService.onFrameCreated().subscribe((frame) => {
      this.frames.push(frame);
      this.frames = [...this.frames]; // Refresh table
    });

    this.userService.onFrameUpdated().subscribe((updatedFrame) => {
      const index = this.frames.findIndex((f) => f._id === updatedFrame._id);
      if (index !== -1) {
        this.frames[index] = updatedFrame;
        this.frames = [...this.frames];
      }
    });

    this.userService.onFrameDeleted().subscribe((id) => {
      this.frames = this.frames.filter((f) => f._id !== id);
    });
  }

  loadFrames() {
    this.userService.findAllFrames().subscribe((frames) => {
      this.frames = frames;
    });
  }

  openFrameDialog(frame?: Frame) {
    const dialogRef = this.dialog.open(FrameDialogComponent, {
      width: '400px',
      data: frame || {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result._id) {
          this.userService.updateFrame(result);
        } else {
          this.userService.createFrame(result);
        }
      }
    });
  }

  deleteFrame(frame: Frame) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer le cadre',
        message: `Êtes-vous sûr de vouloir supprimer le cadre "${frame.name}" ?`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.userService.deleteFrame(frame._id);
      }
    });
  }
}
