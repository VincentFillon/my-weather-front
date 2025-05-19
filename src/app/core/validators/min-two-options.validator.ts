import { AbstractControl, FormArray, ValidationErrors } from '@angular/forms';

// Vérifie qu'il y a au moins deux options non vides
export default function minTwoOptionsValidator(): ValidationErrors | null {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormArray)) {
      return null; // Ne s'applique qu'à FormArray
    }
    const optionsArray = control as FormArray;
    // Compte les contrôles qui ont une valeur non vide (après trim)
    const validOptionsCount = optionsArray.controls.filter((ctrl) => {
      // Si le contrôle est un FormGroup, vérifier la propriété 'value' ou un champ spécifique
      if (typeof ctrl.value === 'object') {
        // Par exemple, vérifier si au moins un champ du FormGroup n'est pas vide
        return Object.values(ctrl.value).some(
          (val) =>
            !!val && (typeof val === 'string' ? val.trim().length > 0 : true)
        );
      }
      // Sinon, comportement classique (FormControl)
      return (
        !!ctrl.value &&
        (typeof ctrl.value === 'string' ? ctrl.value.trim().length > 0 : true)
      );
    }).length;

    return validOptionsCount >= 2 ? null : { minOptions: true };
  };
}
