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
        title: 'Météo des humeurs - Connexion',
        loadChildren: () => import('./auth/auth.routes').then(m => m.routes)
    },
    {
        path: 'board',
        title: 'Météo des humeurs',
        loadChildren: () => import('./board/board.routes').then(m => m.routes),
        canActivate: [AuthGuard]
    },
    {
        path: 'games',
        title: 'Météo des humeurs - Jeux',
        loadChildren: () => import('./games/games.routes').then(m => m.routes),
        canActivate: [AuthGuard]
    },
    {
        path: 'admin',
        title: 'Météo des humeurs - Administration',
        loadChildren: () => import('./admin/admin.routes').then((m) => m.routes),
        canActivate: [AuthGuard, AdminGuard]
    },
    {
        path: 'profile',
        title: 'Météo des humeurs - Mon profil',
        loadChildren: () => import('./profile/profile.routes').then(m => m.routes),
        canActivate: [AuthGuard]
    },
    {
        path: '**',
        redirectTo: 'board'
    }
];
