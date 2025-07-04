import { Location, CommonModule } from '@angular/common';
import { Component, OnDestroy, AfterViewInit } from '@angular/core';
import { listAnimation, flashAnimation } from '../animations';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingComponent } from '../loading/loading';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RealtimeService } from '../services/realtime.service';

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
    listAnimation,
    flashAnimation
  ]
})
export class KeywordDetailComponent implements AfterViewInit, OnDestroy {
  keywordId: string | null = null;
  keywordDetail: KeywordDetail | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  private scrapeAttemptSubscription: Subscription | undefined;
  private keywordUpdateSubscription: Subscription | undefined;

  constructor(private route: ActivatedRoute, private http: HttpClient, private location: Location, private sanitizer: DomSanitizer, private realtimeService: RealtimeService) { }

  ngAfterViewInit(): void {
    this.keywordId = this.route.snapshot.paramMap.get('id');
    if (this.keywordId) {
      this.fetchKeywordDetails(this.keywordId);
    }

    this.scrapeAttemptSubscription = this.realtimeService.onScrapeAttemptCreate().subscribe(updatedAttempt => {
      if (this.keywordDetail && updatedAttempt.keywordId === this.keywordDetail.id) {
        const index = this.keywordDetail.scrapeAttempts.findIndex(att => att.id === updatedAttempt.id);
        if (index !== -1) {
          this.keywordDetail.scrapeAttempts[index] = { ...this.keywordDetail.scrapeAttempts[index], ...updatedAttempt };
        } else {
          // If it's a new attempt for this keyword, add it to the top of the list
          this.keywordDetail.scrapeAttempts.unshift(updatedAttempt);
        }
      }
    });

    this.keywordUpdateSubscription = this.realtimeService.onKeywordUpdate().subscribe(updatedKeyword => {
      if (this.keywordDetail && updatedKeyword.id === this.keywordDetail.id) {
        this.keywordDetail.status = updatedKeyword.status;
      }
    });
  }

  ngOnDestroy(): void {
    this.scrapeAttemptSubscription?.unsubscribe();
    this.keywordUpdateSubscription?.unsubscribe();
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
          // Default to 'raw' view if HTML is present, otherwise 'off'.
          attempt.htmlDisplayMode = attempt.html ? 'raw' : 'off';
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

  setHtmlDisplayMode(attempt: ScrapeAttempt, mode: 'raw' | 'render') {
    // If clicking the active button, toggle it off. Otherwise, switch to the new mode.
    const newMode = attempt.htmlDisplayMode === mode ? 'off' : mode;
    
    attempt.isHtmlLoading = true;
    setTimeout(() => {
      attempt.htmlDisplayMode = newMode;
      attempt.isHtmlLoading = false;
    }, 500);
  }

  getSanitizedHtml(htmlContent: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }
}
