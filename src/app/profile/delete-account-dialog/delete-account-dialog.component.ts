import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-account-dialog',
  templateUrl: './delete-account-dialog.component.html',
  styleUrls: ['./delete-account-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class DeleteAccountDialogComponent {
  dialogRef = inject<MatDialogRef<DeleteAccountDialogComponent>>(MatDialogRef);


  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
