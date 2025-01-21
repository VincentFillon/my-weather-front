import { Component, inject } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Mood } from '../../../core/models/mood';

interface DialogData {
  mode: 'create' | 'edit';
  mood?: Mood;
}

@Component({
  selector: 'app-mood-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
],
  templateUrl: './mood-dialog.component.html',
  styleUrls: ['./mood-dialog.component.scss']
})
export class MoodDialogComponent {
  private fb = inject(FormBuilder);
  dialogRef = inject<MatDialogRef<MoodDialogComponent>>(MatDialogRef);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  mode: 'create' | 'edit';

  constructor() {
    const data = this.data;

    this.mode = data.mode;
    this.form = this.fb.group({
      name: [data.mood?.name || '', [Validators.required]],
      image: [data.mood?.image || '', [Validators.required]],
      sound: [data.mood?.sound || '']
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
