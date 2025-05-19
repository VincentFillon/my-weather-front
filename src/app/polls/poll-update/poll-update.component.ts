import { Component, inject, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PollOption,
  UpdatePollDto
} from '../../core/models/poll';
import { PollService } from '../../core/services/poll.service';
import futureDateValidator from '../../core/validators/future-date.validator';
import minTwoOptionsValidator from '../../core/validators/min-two-options.validator';

@Component({
  selector: 'app-poll-update',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    provideNativeDateAdapter(),
  ],
  templateUrl: './poll-update.component.html',
  styleUrl: './poll-update.component.scss',
})
export class PollUpdateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pollService = inject(PollService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private pollId!: string; // ID du sondage à mettre à jour

  pollForm!: FormGroup;
  isSubmitting = false;
  submitError: string | null = null;

  ngOnInit(): void {
    this.pollId = this.route.snapshot.paramMap.get('pollId')!;

    this.pollForm = this.fb.group({
      _id: ['', Validators.required],
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(100),
        ],
      ],
      description: ['', [Validators.maxLength(500)]],
      // Utilise FormArray pour les options, avec le validateur personnalisé
      options: this.fb.array(
        [this.createOptionControl(), this.createOptionControl()], // Commence avec 2 options
        [minTwoOptionsValidator] // Validateur sur le FormArray lui-même
      ),
      endDate: [this.getMinDate(), [Validators.required, futureDateValidator]],
      multipleChoice: [false, Validators.required], // Default à false
    });

    this.pollService.findOnePoll(this.pollId).subscribe((poll) => {
      if (poll) {
        this.pollForm.patchValue({
          _id: poll._id,
          title: poll.title,
          description: poll.description,
          endDate: poll.endDate,
          multipleChoice: poll.multipleChoice,
        });

        // Remplit le FormArray avec les options existantes
        this.options.clear(); // Vide d'abord le FormArray
        poll.options.forEach((option) => {
          this.options.push(this.createOptionControl(option));
        });
      }
    });
  }

  // Getter pratique pour accéder au FormArray des options dans le template
  get options(): FormArray {
    return this.pollForm.get('options') as FormArray;
  }

  // Crée un FormControl pour une option (requis)
  createOptionControl(option?: PollOption): FormGroup {
    return this.fb.group({
      _id: option?._id || '',
      text: [option?.text || '', Validators.required],
    });
  }

  // Ajoute une nouvelle option vide au FormArray
  addOption(): void {
    this.options.push(this.createOptionControl());
  }

  // Supprime une option à un index donné
  removeOption(index: number): void {
    // Empêche de supprimer s'il ne reste que 2 options
    if (this.options.length > 2) {
      this.options.removeAt(index);
    }
  }

  // Définit la date minimale pour l'input datetime-local
  getMinDate(): Date {
    const minDate = new Date();
    minDate.setMinutes(minDate.getMinutes() + 60);
    return minDate;
  }

  // Gère la soumission du formulaire
  onSubmit(): void {
    this.submitError = null; // Réinitialise l'erreur
    this.pollForm.markAllAsTouched(); // Marque tous les champs pour afficher les erreurs

    // Vérifie la validité de base + le validateur custom du FormArray
    if (this.pollForm.invalid) {
      console.warn('Form is invalid:', this.pollForm.errors);
      // Vérifie spécifiquement l'erreur minOptions pour un message plus clair
      if (this.options.errors?.['minOptions']) {
        this.submitError =
          'Veuillez fournir au moins deux options de vote valides.';
      } else {
        this.submitError = 'Veuillez corriger les erreurs dans le formulaire.';
      }
      return;
    }

    // Filtrer les options vides avant l'envoi
    const optionsValue = this.options.value as { _id?: string; text: string }[];
    const validOptions = optionsValue
      .map((opt) => ({ _id: opt._id, text: opt.text?.trim() })) // Enlève les espaces avant/après
      .filter((opt) => opt.text && opt.text.length > 0); // Garde seulement les non-vides

    // Re-vérifie qu'il y a bien au moins 2 options *après* filtrage
    if (validOptions.length < 2) {
      this.submitError =
        'Veuillez fournir au moins deux options de vote valides.';
      // Marque potentiellement les options vides comme invalides si nécessaire
      this.options.setErrors({
        ...this.options.errors,
        minOptionsAfterFilter: true,
      });
      return;
    }

    this.isSubmitting = true;

    const pollData: UpdatePollDto = {
      _id: this.pollId,
      title: this.pollForm.value.title.trim(),
      description: this.pollForm.value.description,
      options: validOptions,
      endDate: new Date(this.pollForm.value.endDate),
      multipleChoice: this.pollForm.value.multipleChoice,
    };

    console.log('Submitting poll data:', pollData);

    try {
      // Utilise le service pour créer le sondage (via WebSocket)
      this.pollService.updatePoll(pollData);

      // Comme la création est via WebSocket, on n'a pas de retour direct ici.
      // On pourrait écouter l'événement 'pollCreated' mais pour simplifier,
      // on navigue directement après l'émission. Le composant liste se mettra à jour.
      // Idéalement, attendre une confirmation ou gérer l'erreur si l'émission échoue.

      console.log('Poll update request sent.');
      // Navigue vers la liste après un court instant pour laisser le temps à l'émission
      setTimeout(() => {
        this.router.navigate(['/polls', this.pollId]);
      }, 300); // Petit délai
    } catch (error) {
      console.error('Error sending poll update request:', error);
      this.submitError =
        'Une erreur est survenue lors de la modification du sondage.';
      this.isSubmitting = false;
    }

    // Note: La gestion d'erreur ici est basique car l'émission WebSocket
    // n'a pas de retour direct standard comme une requête HTTP.
    // Une meilleure gestion impliquerait des acquittements ou des événements d'erreur
    // spécifiques depuis le backend via WebSocket.
  }

  // Navigation retour
  goBack(): void {
    this.router.navigate(['/polls', this.pollId]);
  }

  // --- Helpers pour l'affichage des erreurs dans le template ---
  isControlInvalid(controlName: string): boolean {
    const control = this.pollForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getControlError(controlName: string, errorCode: string): boolean {
    const control = this.pollForm.get(controlName);
    return !!control && control.hasError(errorCode);
  }

  isOptionControlInvalid(index: number): boolean {
    const control = this.options.at(index);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
