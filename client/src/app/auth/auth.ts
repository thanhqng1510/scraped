import { Component } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

const firebaseConfig = {
  apiKey: "AIzaSyANj0qvGGTtTC3XenZ3HGhNebIepw1kyjY",
  authDomain: "scraped-8b8d7.firebaseapp.com",
  projectId: "scraped-8b8d7",
  storageBucket: "scraped-8b8d7.firebasestorage.app",
  messagingSenderId: "427841229827",
  appId: "1:427841229827:web:f65822c0373aca8c886a36"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss'
})
export class AuthComponent {
  email!: string;
  password!: string;
  errorMessage: string | null = null;

  constructor(private router: Router) { }

  async onLogin() {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
      const idToken = await userCredential.user.getIdToken();
      await this.sendTokenToBackend(idToken);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error.message;
      console.error("Login error:", error);
    }
  }

  async onSignup() {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
      const idToken = await userCredential.user.getIdToken();
      await this.sendTokenToBackend(idToken);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error.message;
      console.error("Sign up error:", error);
    }
  }

  private async sendTokenToBackend(idToken: string) {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('jwtToken', data.token);
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Authentication failed on backend.');
    }
  }
}