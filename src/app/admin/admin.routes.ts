import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MoodManagementComponent } from './mood-management/mood-management.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { MediaComponent } from './media/media.component';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full'
      },
      {
        path: 'users',
        component: UserManagementComponent
      },
      {
        path: 'moods',
        component: MoodManagementComponent
      },
      {
        path: 'media',
        component: MediaComponent
      }
    ]
  }
];
