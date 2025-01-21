import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    RouterLink,
  ],
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  registerForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor() {
    this.registerForm = this.fb.group(
      {
        username: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    if (this.authService.getToken()) {
      this.router.navigate(['/board']);
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isLoading) {
      this.isLoading = true;
      const { username, password } = this.registerForm.value;

      this.authService.register(username, password).subscribe({
        next: () => {
          this.snackBar.open('Compte créé avec succès !', 'Fermer', {
            duration: 3000,
          });
          this.router.navigate(['/board']);
        },
        error: (error) => {
          this.isLoading = false;
          let message = 'Une erreur est survenue';

          if (error.status === 409) {
            message = "Ce nom d'utilisateur existe déjà";
          } else if (error.status === 400) {
            if (
              Array.isArray(error.error.message) &&
              error.error.message.length
            ) {
              message = error.error.message.join(', ');
            } else {
              message = 'Données invalides';
            }
          }

          this.snackBar.open(message, 'Fermer', { duration: 5000 });
        },
      });
    }
  }
}
