import { Routes } from '@angular/router';
import { AdminGuard } from './core/guards/admin.guard';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'board',
        pathMatch: 'full'
    },
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes').then(m => m.routes)
    },
    {
        path: 'board',
        loadChildren: () => import('./board/board.routes').then(m => m.routes),
        canActivate: [AuthGuard]
    },
    {
        path: 'games',
        loadChildren: () => import('./games/games.routes').then(m => m.routes),
        canActivate: [AuthGuard]
    },
    {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then((m) => m.routes),
        canActivate: [AuthGuard, AdminGuard]
    },
    {
        path: 'profile',
        loadChildren: () => import('./profile/profile.routes').then(m => m.routes),
        canActivate: [AuthGuard]
    },
    {
        path: '**',
        redirectTo: 'board'
    }
];
