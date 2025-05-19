import { Routes } from '@angular/router';
import { PollCreateComponent } from './poll-create/poll-create.component';
import { PollDetailComponent } from './poll-detail/poll-detail.component';
import { PollUpdateComponent } from './poll-update/poll-update.component';
import { PollsListComponent } from './polls-list/polls-list.component';

export const routes: Routes = [
  { path: '', component: PollsListComponent },
  { path: 'new', component: PollCreateComponent },
  { path: ':pollId', component: PollDetailComponent },
  { path: ':pollId/edit', component: PollUpdateComponent },
];
