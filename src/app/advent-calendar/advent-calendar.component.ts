import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdventCalendarService, AdventCalendarDay } from '../core/services/advent-calendar.service';
import { Observable, Subscription } from 'rxjs';
import { SocketService } from '../core/services/socket.service';
import { UserService } from '../core/services/user.service';
import { AuthService } from '../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-advent-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advent-calendar.component.html',
  styleUrls: ['./advent-calendar.component.scss']
})
export class AdventCalendarComponent implements OnInit, OnDestroy {
  calendar$!: Observable<AdventCalendarDay[]>;
  selectedDay: AdventCalendarDay | null = null;
  notificationMessage: string | null = null;
  private socketSubscription!: Subscription;

  constructor(
    private adventCalendarService: AdventCalendarService,
    private socketService: SocketService,
    private userService: UserService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadCalendar();
  }

  ngOnDestroy() {
      if (this.socketSubscription) {
          this.socketSubscription.unsubscribe();
      }
  }

  loadCalendar() {
    this.calendar$ = this.adventCalendarService.getCalendar();
  }

  openDay(day: AdventCalendarDay) {
    if (day.status === 'LOCKED') return;

    if (day.status === 'OPENED') {
        this.selectedDay = day;
        return;
    }

    this.adventCalendarService.openDay(day.day).subscribe({
      next: (openedDay) => {
        this.selectedDay = { ...day, ...openedDay, status: 'OPENED' };
        this.loadCalendar(); // Refresh grid
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Impossible d\'ouvrir cette case', 'Fermer', { duration: 3000 });
      }
    });
  }

  closeModal() {
    this.selectedDay = null;
  }

  equipFrame() {
      const user = this.authService.currentUser();
      if (!user) return;

      this.userService.findOneUser(user._id).subscribe(fullUser => {
          const frame = fullUser?.frames?.find((f: any) => f.name === "Cadre de l'Avent");
          if (frame) {
              this.userService.selectFrame(frame._id);
              // Wait for confirmation
              this.userService.onUserFrameSelected().subscribe(() => {
                  this.snackBar.open('Cadre équipé !', 'Fermer', { duration: 3000 });
                  this.closeModal();
              });
          } else {
              this.snackBar.open('Cadre non trouvé', 'Fermer', { duration: 3000 });
          }
      });
  }
}
