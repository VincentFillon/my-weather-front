import { Component, inject } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { User } from '../../../core/models/user';
import { Role } from '../../../core/models/role.enum';

interface DialogData {
  user?: User;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss']
})
export class UserDialogComponent {
  private fb = inject(FormBuilder);
  dialogRef = inject<MatDialogRef<UserDialogComponent>>(MatDialogRef);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  roles = Object.values(Role);
  isNewUser: boolean;

  constructor() {
    const data = this.data;

    this.isNewUser = !data.user;
    this.form = this.fb.group({
      username: [data.user?.username || '', [Validators.required]],
      role: [data.user?.role || Role.USER, [Validators.required]],
      image: [data.user?.image || ''],
      password: ['', this.isNewUser ? [Validators.required, Validators.minLength(6)] : []]
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.value;
      // Ne pas inclure le mot de passe si c'est vide (modification d'utilisateur)
      if (!this.isNewUser && !formValue.password) {
        const { password, ...userData } = formValue;
        this.dialogRef.close(userData);
      } else {
        this.dialogRef.close(formValue);
      }
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
