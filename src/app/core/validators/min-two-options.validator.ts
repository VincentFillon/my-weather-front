import { AbstractControl, FormArray, ValidationErrors } from '@angular/forms';

// Vérifie qu'il y a au moins deux options non vides
export default function minTwoOptionsValidator(): ValidationErrors | null {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormArray)) {
      return null; // Ne s'applique qu'à FormArray
    }
    const optionsArray = control as FormArray;
    // Compte les contrôles qui ont une valeur non vide (après trim)
    const validOptionsCount = optionsArray.controls.filter(
      (ctrl) => ctrl.value && ctrl.value.trim().length > 0
    ).length;

    return validOptionsCount >= 2 ? null : { minOptions: true };
  };
}
