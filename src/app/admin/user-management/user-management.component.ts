import { Component, OnDestroy, OnInit, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Subscription } from 'rxjs';
import { User } from '../../core/models/user';
import { UserService } from '../../core/services/user.service';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, AvatarComponent],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);

  users: User[] = [];
  displayedColumns: string[] = ['image', 'displayName', 'username', 'role', 'mood', 'actions'];
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.userService.findAllUsers().subscribe((users) => {
        this.users = users;
      })
    );
    this.subscriptions.push(
      this.userService.onUserCreated().subscribe((user) => {
        this.users = [...this.users, user];
      })
    );
    this.subscriptions.push(
      this.userService.onUserRemoved().subscribe((userId) => {
        this.users = this.users.filter((u) => u._id !== userId);
      })
    );
    this.subscriptions.push(
      this.userService.onUserUpdated().subscribe((user) => {
        this.users = this.users.map((u) => (u._id === user._id ? user : u));
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onEditUser(user: User) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '400px',
      data: { user },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.userService.updateUser({
          _id: user._id,
          ...result,
        });
      }
    });
  }

  onDeleteUser(id: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userService.removeUser(id);
    }
  }
}
