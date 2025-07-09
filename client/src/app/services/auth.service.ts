import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { environment } from '../auth/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

const firebaseConfig = environment.firebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private hasToken(): boolean {
    return !!localStorage.getItem('jwtToken');
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await this.handleAuthSuccess(userCredential);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  async signup(email: string, password: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await this.handleAuthSuccess(userCredential);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  private async handleAuthSuccess(userCredential: UserCredential): Promise<void> {
    const idToken = await userCredential.user.getIdToken();
    const response: any = await firstValueFrom(this.http.post('/login', { idToken }));

    localStorage.setItem('jwtToken', response.token);

    this.isAuthenticatedSubject.next(true);
  }

  private handleAuthError(error: any): Error {
    console.error('Authentication error:', error);
    let errorMessage = 'An unknown error occurred. Please try again.';

    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'The email address is not valid. Please check the format.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This user account has been disabled.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No user found with this email. Please sign up first.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password. Please try again.';
        break;
      case 'auth/email-already-in-use':
        errorMessage = 'This email address is already in use by another account.';
        break;
      case 'auth/weak-password':
        errorMessage = 'The password is too weak. It must be at least 6 characters long.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'The credentials provided are invalid. Please check your email and password.';
        break;
      default:
        // Attempt to extract a cleaner message from the default error
        const message = error.message || '';
        if (message.includes('(')) {
          errorMessage = message.substring(0, message.indexOf('(')).trim();
        } else {
          errorMessage = message;
        }
        break;
    }
    return new Error(errorMessage);
  }

  logout(): void {
    localStorage.removeItem('jwtToken');
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('jwtToken');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    // You might want to add more robust token validation here (e.g., check expiration)
    return !!token;
  }
}