import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth';
import { DashboardComponent } from './dashboard/dashboard';
import { KeywordDetailComponent } from './keyword-detail/keyword-detail';
import { authGuard } from './guards/auth.guard';
import { publicGuard } from './guards/public.guard';

export const routes: Routes = [
  { path: 'login', component: AuthComponent, canActivate: [publicGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'keywords/:id', component: KeywordDetailComponent, canActivate: [authGuard] },
];