import { AbstractControl, ValidationErrors } from '@angular/forms';

// Vérifie que la date est dans le futur
export default function futureDateValidator(): ValidationErrors | null {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Ne pas valider si vide (required s'en chargera)
    }
    const selectedDate = new Date(control.value);
    const now = new Date();
    // Met les secondes et millisecondes à 0 pour éviter les erreurs de comparaison mineures
    now.setSeconds(0, 0);
    selectedDate.setSeconds(0, 0);

    return selectedDate > now ? null : { pastDate: true };
  };
}
