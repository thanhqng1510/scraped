import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { listAnimation } from '../animations';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoadingComponent } from '../loading/loading';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ScrapeAttempt {
  id: number;
  html?: string;
  adCount: number;
  linkCount: number;
  status: string;
  error?: string;
  createdAt: string;
  htmlDisplayMode?: 'off' | 'raw' | 'render';
  isHtmlLoading?: boolean;
}

interface KeywordDetail {
  id: number;
  text: string;
  status: string;
  createdAt: string;
  scrapeAttempts: ScrapeAttempt[];
}

@Component({
  selector: 'app-keyword-detail',
  standalone: true,
  imports: [CommonModule, LoadingComponent],
  templateUrl: './keyword-detail.html',
  styleUrl: './keyword-detail.scss',
  animations: [
    listAnimation
  ]
})
export class KeywordDetailComponent implements OnInit {
  keywordId: string | null = null;
  keywordDetail: KeywordDetail | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  constructor(private route: ActivatedRoute, private http: HttpClient, private location: Location, private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.keywordId = this.route.snapshot.paramMap.get('id');
    if (this.keywordId) {
      this.fetchKeywordDetails(this.keywordId);
    }
  }

  goBack(): void {
    this.location.back();
  }

  async fetchKeywordDetails(id: string) {
    this.isLoading = true;
    this.errorMessage = null;
    try {
      const response: any = await firstValueFrom(this.http.get(`/api/v1/keywords/${id}`));
      this.keywordDetail = response;
      // Initialize htmlDisplayMode for each attempt
      if (this.keywordDetail) {
        this.keywordDetail.scrapeAttempts.forEach(attempt => {
        attempt.htmlDisplayMode = 'off';
        attempt.isHtmlLoading = false;
      });
      }
    } catch (error: any) {
      this.errorMessage = `Failed to load keyword details: ${error.error.message || error.message}`;
      console.error('Error fetching keyword details:', error);
    } finally {
      this.isLoading = false;
    }
  }

  setHtmlDisplayMode(attempt: ScrapeAttempt, mode: 'off' | 'raw' | 'render') {
    if (attempt.htmlDisplayMode === mode) {
      return; // No change needed
    }

    attempt.isHtmlLoading = true;
    setTimeout(() => {
      attempt.htmlDisplayMode = mode;
      attempt.isHtmlLoading = false;
    }, 100);
  }

  getSanitizedHtml(htmlContent: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }
}