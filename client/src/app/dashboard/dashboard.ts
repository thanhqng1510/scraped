import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  userData: any = null;
  errorMessage: string | null = null;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.fetchUserData();
  }

  async fetchUserData() {
    const jwtToken = localStorage.getItem('jwtToken');
    if (!jwtToken) {
      this.errorMessage = 'No JWT token found. Please log in.';
      this.router.navigate(['/login']);
      return;
    }

    try {
      const response = await fetch('/api/v1/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.ok) {
        this.userData = await response.json();
      } else {
        const errorData = await response.json();
        this.errorMessage = errorData.message || 'Error fetching user data.';
      }
    } catch (error: any) {
      this.errorMessage = `Network error: ${error.message}`;
      console.error('Error fetching user data:', error);
    }
  }

  logout() {
    localStorage.removeItem('jwtToken');
    this.router.navigate(['/login']);
  }
}