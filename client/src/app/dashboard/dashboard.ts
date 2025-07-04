import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoadingComponent } from '../loading/loading';
import { Keyword, KeywordService } from '../services/keyword.service';
import { OnInit, OnDestroy, Component } from '@angular/core';
import { RealtimeService } from '../services/realtime.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { listAnimation, flashAnimation } from '../animations';  

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LoadingComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  animations: [listAnimation, flashAnimation]
})
export class DashboardComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  selectedFile: File | null = null;
  uploadMessage: string | null = null;
  fileInput: HTMLInputElement | null = null;

  keywords: Keyword[] = [];
  currentPage: number = 1;
  totalPages: number = 1;
  totalKeywords: number = 0;
  limit: number = 10;

  private keywordSubscription: Subscription | undefined;
  private realtimeSubscription: Subscription | undefined;

  constructor(private http: HttpClient, private keywordService: KeywordService, private router: Router, private realtimeService: RealtimeService) { }

  ngOnInit(): void {
    this.keywordSubscription = this.keywordService.keywords$.subscribe(response => {
      if (response) {
        this.keywords = [];
        setTimeout(() => { this.keywords = response.data; }, 50);

        this.currentPage = response.pagination.page;
        this.totalPages = response.pagination.totalPages;
        this.totalKeywords = response.pagination.total;
        this.isLoading = false;
      }
    });

    this.keywordService.loadKeywords(this.currentPage, this.limit);

    this.realtimeSubscription = this.realtimeService.onKeywordUpdate().subscribe(updatedKeyword => {
      const index = this.keywords.findIndex(k => k.id === updatedKeyword.id);
      if (index !== -1) {
        this.keywords[index] = { ...this.keywords[index], ...updatedKeyword };
      } else {
        // If the keyword is not in the current view, refresh the list
        this.keywordService.loadKeywords(this.currentPage, this.limit);
      }
    });
  }

  ngOnDestroy(): void {
    this.keywordSubscription?.unsubscribe();
    this.realtimeSubscription?.unsubscribe();
  }

  loadKeywords() {
    this.isLoading = true;
    this.keywordService.loadKeywords(this.currentPage, this.limit);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.keywordService.loadKeywords(this.currentPage, this.limit);
    }
  }

  get pages(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i + 1);
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
      this.selectedFile = null;
      if (this.fileInput) {
        this.fileInput.value = ''; // Clear the file input
      }
      
      this.keywordService.refreshKeywords(); // Refresh keyword list after upload
    } catch (error: any) {
      this.uploadMessage = `Upload failed: ${error.error.message || error.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] || null;
    this.fileInput = event.target;
    this.uploadMessage = null;
  }

  viewDetails(keywordId: number) {
    this.router.navigate(['/keywords', keywordId]);
  }
}