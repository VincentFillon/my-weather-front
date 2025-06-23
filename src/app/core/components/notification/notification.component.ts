import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef
} from '@angular/material/snack-bar';

export interface NotificationAction {
  order?: number;
  label: string;
  icon?: string;
  iconOnly?: boolean;
  action: () => void;
}

export interface NotificationData {
  title?: string;
  image?: string;
  icon?: string;
  content: string;
  actions?: NotificationAction[];
}

@Component({
  selector: 'app-notification',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
})
export class NotificationComponent {
  alignRight = false;

  constructor(
    public snackBarRef: MatSnackBarRef<NotificationComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: NotificationData
  ) {
    if (
      this.snackBarRef.containerInstance.snackBarConfig.horizontalPosition ===
        'end' ||
      this.snackBarRef.containerInstance.snackBarConfig.horizontalPosition ===
        'right'
    ) {
      this.alignRight = true;
    }

    this.snackBarRef.containerInstance.snackBarConfig.panelClass = 'notification-snackbar';
  }
}
