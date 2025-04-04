import { animate, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game-selection',
  imports: [MatButtonModule],
  templateUrl: './game-selection.component.html',
  styleUrl: './game-selection.component.scss',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '500ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [animate('500ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
})
export class GameSelectionComponent {
  isExiting = false; // Pour gérer l'animation de sortie

  constructor(private router: Router) {}

  navigateTo(game: string) {
    this.isExiting = true; // Déclenche l'animation
    setTimeout(() => {
      this.router.navigate(['/games', game]);
    }, 500); // Attendre la fin de l'animation avant de naviguer
  }

  goBack() {
    this.router.navigate(['/board']);
  }
}
