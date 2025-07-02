import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class DashboardComponent {
  isLoading: boolean = false;
  selectedFile: File | null = null;
  uploadMessage: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) { }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] || null;
    this.uploadMessage = null;
  }

  async uploadFile() {
    if (!this.selectedFile) {
      this.uploadMessage = 'Please select a file first.';
      return;
    }

    this.isLoading = true;
    this.uploadMessage = null;
    const formData = new FormData();
    formData.append('keywords_file', this.selectedFile, this.selectedFile.name);

    try {
      const response: any = await firstValueFrom(this.http.post('/api/v1/keywords/upload', formData));
      this.uploadMessage = `Upload successful: ${response.count} keywords processed.`;
      this.selectedFile = null; // Clear selected file after successful upload
      // Optionally, refresh keyword list here later
    } catch (error: any) {
      this.uploadMessage = `Upload failed: ${error.error.message || error.message}`;
      console.error('Upload error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  logout() {
    this.authService.logout();
  }
}