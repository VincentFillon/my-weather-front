import { Routes } from '@angular/router';
import { PollCreateComponent } from './poll-create/poll-create.component';
import { PollDetailComponent } from './poll-detail/poll-detail.component';
import { PollsListComponent } from './polls-list/polls-list.component';

export const routes: Routes = [
  { path: '', component: PollsListComponent },
  { path: 'new', component: PollCreateComponent },
  { path: ':id', component: PollDetailComponent },
];
