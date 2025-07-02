import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { environment } from './environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

const firebaseConfig = environment.firebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

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
    const response: any = await this.http.post('/login', { idToken }).toPromise();
    localStorage.setItem('jwtToken', response.token);
    this.isAuthenticatedSubject.next(true);
  }

  private handleAuthError(error: any): Error {
    console.error("Authentication error:", error);
    let errorMessage = 'An unknown error occurred.';
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'User account has been disabled.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'User not found.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Wrong password.';
        break;
      case 'auth/email-already-in-use':
        errorMessage = 'Email already in use.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak.';
        break;
      default:
        errorMessage = error.message || errorMessage;
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