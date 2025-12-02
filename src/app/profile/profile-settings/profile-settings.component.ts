import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { UserService } from '../../core/services/user.service';
import { DeleteAccountDialogComponent } from '../delete-account-dialog/delete-account-dialog.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [
    MatCardModule,
    MatSnackBarModule,
    MatDialogModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSnackBarModule,
    MatDividerModule,
    AvatarComponent,
    CommonModule,
  ],
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss'],
})
export class ProfileSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private uploadService = inject(UploadService);
  private userService = inject(UserService);

  displayNameForm: FormGroup;
  usernameForm: FormGroup;
  imageForm: FormGroup;
  passwordForm: FormGroup;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  currentUser: User | null = null;

  constructor() {
    this.displayNameForm = new FormGroup({
      displayName: new FormControl('', [Validators.required]),
    });

    this.usernameForm = new FormGroup({
      username: new FormControl('', [Validators.required]),
    });

    this.imageForm = new FormGroup({
      image: new FormControl('', [Validators.required]),
    });

    const passwordMatchValidator: ValidatorFn = (g: AbstractControl) => {
      return g.get('newPassword')?.value === g.get('confirmPassword')?.value
        ? null
        : { mismatch: true };
    };

    this.passwordForm = new FormGroup(
      {
        currentPassword: new FormControl('', [Validators.required]),
        newPassword: new FormControl('', [
          Validators.required,
          Validators.minLength(6),
        ]),
        confirmPassword: new FormControl('', [Validators.required]),
      },
      { validators: [passwordMatchValidator] }
    );
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.userService.findOneUser(user._id).subscribe((user) => {
          this.currentUser = user;
          this.displayNameForm.patchValue({
            displayName: user.displayName,
          });
          this.usernameForm.patchValue({
            username: user.username,
          });
          this.imageForm.patchValue({
            image: user.image,
          });
        });
      }
    });
  }

  onUpdateDisplayName(): void {
    if (this.displayNameForm.valid) {
      const { displayName } = this.displayNameForm.value;
      this.authService.updateDisplayName(displayName).subscribe({
        next: (user: User) => {
          this.snackBar.open('Pseudonyme mis à jour avec succès', 'Fermer', {
            duration: 3000,
          });
        },
        error: (error: any) => {
          let message = 'Une erreur est survenue';
          if (error.status === 409) {
            message = 'Ce pseudonyme est déjà utilisé';
          }
          this.snackBar.open(message, 'Fermer', { duration: 5000 });
        },
      });
    }
  }

  onUpdateUsername(): void {
    if (this.usernameForm.valid) {
      const { username } = this.usernameForm.value;
      this.authService.updateUsername(username).subscribe({
        next: (user: User) => {
          this.snackBar.open(
            "Nom d'utilisateur mis à jour avec succès",
            'Fermer',
            {
              duration: 3000,
            }
          );
        },
        error: (error: any) => {
          let message = 'Une erreur est survenue';
          if (error.status === 409) {
            message = "Ce nom d'utilisateur est déjà utilisé";
          }
          this.snackBar.open(message, 'Fermer', { duration: 5000 });
        },
      });
    }
  }

  onUpdateImage(): void {
    if (this.imageForm.valid) {
      const { image } = this.imageForm.value;
      this.authService.updateImage(image).subscribe({
        next: () => {
          this.snackBar.open('Image mise à jour avec succès', 'Fermer', {
            duration: 3000,
          });
        },
        error: (error: any) => {
          this.snackBar.open(
            "Une erreur est survenue lors de la mise à jour de l'image",
            'Fermer',
            {
              duration: 5000,
            }
          );
        },
      });
    }
  }

  uploadProfileImage(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadService.uploadUserImage(file).subscribe({
        next: (response: any) => {
          this.snackBar.open('Profile image updated successfully', 'Close', {
            duration: 3000,
          });
          // TODO: Update user profile image in the UI
        },
        error: (error) => {
          this.snackBar.open('Error updating profile image', 'Close', {
            duration: 3000,
          });
        },
      });
    }
  }

  onUpdatePassword(): void {
    if (this.passwordForm.valid) {
      const { currentPassword, newPassword } = this.passwordForm.value;
      this.authService.updatePassword(currentPassword, newPassword).subscribe({
        next: () => {
          this.passwordForm.reset();
          this.snackBar.open('Mot de passe mis à jour avec succès', 'Fermer', {
            duration: 3000,
          });
        },
        error: (error: any) => {
          let message = 'Une erreur est survenue';
          if (error.status === 401) {
            message = 'Mot de passe actuel incorrect';
          }
          this.snackBar.open(message, 'Fermer', { duration: 5000 });
        },
      });
    }
  }

  onDeleteAccount(): void {
    const dialogRef = this.dialog.open(DeleteAccountDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.authService.deleteAccount().subscribe({
          next: () => {
            // console.debug('[ProfileSettingsComponent] logout');
            this.authService.logout();
            this.snackBar.open('Compte supprimé avec succès', 'Fermer', {
              duration: 3000,
            });
          },
          error: () => {
            this.snackBar.open(
              'Une erreur est survenue lors de la suppression du compte',
              'Fermer',
              {
                duration: 5000,
              }
            );
          },
        });
      }
    });
  }

  onSelectFrame(frameId: string): void {
    this.userService.selectFrame(frameId);
    this.snackBar.open('Cadre mis à jour', 'Fermer', { duration: 3000 });
  }
}
