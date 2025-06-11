import { Component, inject } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ColorPickerDirective } from 'ngx-color-picker';
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
    MatButtonModule,
    ColorPickerDirective,
  ],
  templateUrl: './mood-dialog.component.html',
  styleUrls: ['./mood-dialog.component.scss'],
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
      color: [data.mood?.color || ''],
      sound: [data.mood?.sound || ''],
    });
  }

  public get moodColor(): string {
    return this.form.controls['color'].value;
  }
  public set moodColor(value: string) {
    this.form.controls['color'].setValue(value);
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
