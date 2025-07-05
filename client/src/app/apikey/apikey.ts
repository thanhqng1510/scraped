import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { LoadingComponent } from '../loading/loading';
import { listAnimation } from '../animations';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
}

@Component({
  selector: 'app-apikey',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent],
  templateUrl: './apikey.html',
  styleUrls: ['./apikey.scss'],
  animations: [listAnimation]
})
export class ApiKeyComponent implements AfterViewInit {
  apiKeys: ApiKey[] = [];
  isLoading = false;
  isGenerating = false;
  errorMessage: string | null = null;
  newlyGeneratedKey: string | null = null;
  apiKeyForm: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    public authService: AuthService,
  ) {
    this.apiKeyForm = this.fb.group({
      name: ['', [Validators.required]],
      expiresInDays: [null],
    });
  }

  ngAfterViewInit(): void {
    this.loadApiKeys();
  }

  async loadApiKeys(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      this.apiKeys = await firstValueFrom(this.http.get<ApiKey[]>('/api/v1/apikeys'));
      this.apiKeys.forEach(key => {
        key.isExpired = this.isExpired(key.expiresAt);
      });
    } catch (error) {
      this.errorMessage = 'Failed to load API keys.';
    } finally {
      this.isLoading = false;
    }
  }

  async generateApiKey(): Promise<void> {
    if (this.apiKeyForm.invalid) return;

    this.isGenerating = true;
    this.newlyGeneratedKey = null;
    this.errorMessage = null;

    const { name, expiresInDays } = this.apiKeyForm.value;
    const payload: { name: string; expiresInDays?: number } = { name };
    if (expiresInDays) {
      payload.expiresInDays = Number(expiresInDays);
    }

    try {
      const response = await firstValueFrom(this.http.post<{ key: string }>('/api/v1/apikeys', payload));
      this.newlyGeneratedKey = response.key;
      this.apiKeyForm.reset();
      await this.loadApiKeys();
    } catch (error) {
      this.errorMessage = 'Failed to generate API key.';
    } finally {
      setTimeout(() => {
        this.isGenerating = false;
      }, 500);
    }
  }

  async revokeApiKey(id: string): Promise<void> {
    if (confirm('Are you sure you want to revoke this API key? It will become unusable immediately.')) {
      await firstValueFrom(this.http.patch(`/api/v1/apikeys/${id}/revoke`, {}));
      await this.loadApiKeys();
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }
}
