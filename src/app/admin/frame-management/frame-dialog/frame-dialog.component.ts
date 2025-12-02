import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Frame } from '../../../core/models/user';

@Component({
  selector: 'app-frame-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './frame-dialog.component.html',
  styleUrls: ['./frame-dialog.component.scss'],
})
export class FrameDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<FrameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<Frame>
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
