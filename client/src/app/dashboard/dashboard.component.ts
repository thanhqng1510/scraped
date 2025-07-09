import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoadingComponent } from '../loading/loading.component';
import { Keyword, KeywordService } from '../services/keyword.service';
import { OnInit, OnDestroy, Component } from '@angular/core';
import { RealtimeService } from '../services/realtime.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { listAnimation, flashAnimation } from '../animations';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LoadingComponent, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [listAnimation, flashAnimation]
})
export class DashboardComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  selectedFile: File | null = null;
  uploadMessage: string | null = null;
  uploadMessageType: 'success' | 'error' = 'success';
  fileInput: HTMLInputElement | null = null;

  keywords: Keyword[] = [];
  currentPage: number = 1;
  totalPages: number = 1;
  totalKeywords: number = 0;
  limit: number = 20;
  searchTerm: string = '';

  private keywordSubscription: Subscription | undefined;
  private realtimeSubscription: Subscription | undefined;

  constructor(private http: HttpClient, private keywordService: KeywordService, private router: Router, private realtimeService: RealtimeService) { }

  ngOnInit(): void {
    this.keywordSubscription = this.keywordService.keywords$.subscribe(response => {
      if (response) {
        this.keywords = [];
        setTimeout(() => { 
          this.keywords = response.data;
          this.isLoading = false;
        }, 50);

        this.currentPage = response.pagination.page;
        this.totalPages = response.pagination.totalPages;
        this.totalKeywords = response.pagination.total;
      }
    });

    this.isLoading = true;
    this.keywordService.loadKeywords(this.currentPage, this.limit, this.searchTerm);

    this.realtimeSubscription = this.realtimeService.onKeywordUpdate().subscribe(updatedKeyword => {
      const index = this.keywords.findIndex(k => k.id === updatedKeyword.id);
      if (index !== -1) {
        this.keywords[index] = { ...this.keywords[index], ...updatedKeyword };
      }
    });
  }

  ngOnDestroy(): void {
    this.keywordSubscription?.unsubscribe();
    this.realtimeSubscription?.unsubscribe();
  }

  performSearch() {
    this.isLoading = true;
    this.keywordService.setSearchTerm(this.searchTerm);
  }

  goToPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.keywordService.loadKeywords(this.currentPage, this.limit);
    }
  }

  get pages(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i + 1);
  }

  get visiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5; // Max number of page buttons to display
    const half = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, this.currentPage - half);
    let endPage = Math.min(this.totalPages, this.currentPage + half);

    if (endPage - startPage + 1 < maxPagesToShow) {
      if (startPage === 1) {
        endPage = Math.min(this.totalPages, maxPagesToShow);
      } else if (endPage === this.totalPages) {
        startPage = Math.max(1, this.totalPages - maxPagesToShow + 1);
      }
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        pages.push('...');
      }
      pages.push(this.totalPages);
    }

    return pages;
  }

  async uploadFile() {
    if (!this.selectedFile) {
      this.uploadMessage = 'Please select a file first.';
      this.uploadMessageType = 'error';
      return;
    }

    this.isLoading = true;
    this.uploadMessage = null;
    const formData = new FormData();
    formData.append('keywords_file', this.selectedFile, this.selectedFile.name);

    try {
      const response: any = await firstValueFrom(this.http.post('/api/v1/keywords/upload', formData));
      this.uploadMessage = `Upload successful: ${response.count} keywords processed.`;
      this.uploadMessageType = 'success';
      this.selectedFile = null;
      if (this.fileInput) {
        this.fileInput.value = ''; // Clear the file input
      }
      
      this.searchTerm = ''; // Reset search term after successful upload
      this.keywordService.setSearchTerm(this.searchTerm); // Refresh keyword list after upload
    } catch (error: any) {
      this.uploadMessage = `Upload failed: ${error.error.message || error.message}`;
      this.uploadMessageType = 'error';
    } finally {
      this.isLoading = false;
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] || null;
    this.fileInput = event.target;
    this.uploadMessage = null;
  }

  viewDetails(keywordId: string) {
    this.router.navigate(['/keywords', keywordId]);
  }
}