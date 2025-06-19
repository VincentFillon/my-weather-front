import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-full-screen-media-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './full-screen-media-dialog.component.html',
  styleUrls: ['./full-screen-media-dialog.component.scss']
})
export class FullScreenMediaDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<FullScreenMediaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mediaUrl: string }
  ) {}

  closeDialog(): void {
    this.dialogRef.close();
  }
}
