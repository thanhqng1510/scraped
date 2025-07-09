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
  confirmPassword!: string;
  errorMessage: string | null = null;
  isLoading: boolean = false;
  formMode: 'login' | 'signup' = 'login';

  constructor(private authService: AuthService, private router: Router) { }

  switchMode(mode: 'login' | 'signup') {
    this.formMode = mode;
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.errorMessage = null;
  }

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
    if (this.password !== this.confirmPassword) {
      this.errorMessage = "Passwords do not match.";
      return;
    }
    
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
