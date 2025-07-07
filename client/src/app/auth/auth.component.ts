import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoadingComponent } from '../loading/loading.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule, LoadingComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  email!: string;
  password!: string;
  errorMessage: string | null = null;
  isLoading: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  async onLogin() {
    this.isLoading = true;
    this.errorMessage = null;
    try {
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error.message;
      console.error("Login error:", error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSignup() {
    this.isLoading = true;
    this.errorMessage = null;
    try {
      await this.authService.signup(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error.message;
      console.error("Sign up error:", error);
    } finally {
      this.isLoading = false;
    }
  }
}
