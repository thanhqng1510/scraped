import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { KeywordDetailComponent } from './keyword-detail/keyword-detail.component';
import { authGuard } from './guards/auth.guard';
import { publicGuard } from './guards/public.guard';
import { ApiKeyComponent } from './apikey/apikey.component';

export const routes: Routes = [
  { path: 'login', component: AuthComponent, canActivate: [publicGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'keywords/:id', component: KeywordDetailComponent, canActivate: [authGuard] },
  { path: 'apikey', component: ApiKeyComponent, canActivate: [authGuard] },
];