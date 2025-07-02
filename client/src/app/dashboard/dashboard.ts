import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom } from 'rxjs';
import { LoadingComponent } from '../loading/loading';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LoadingComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  userData: any = null;
  errorMessage: string | null = null;
  isLoading: boolean = false;

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.fetchUserData();
  }

  async fetchUserData() {
    if (!this.authService.getToken()) {
      this.errorMessage = 'No JWT token found. Please log in.';
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    try {
      this.userData = await firstValueFrom(this.http.get('/api/v1/me'));
    } catch (error: any) {
      this.errorMessage = error.message || 'Error fetching user data.';
      console.error('Error fetching user data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  logout() {
    this.authService.logout();
  }
}