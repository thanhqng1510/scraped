import { Location, CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { listAnimation } from '../animations';
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
    listAnimation
  ]
})
export class KeywordDetailComponent implements OnInit, OnDestroy {
  keywordId: string | null = null;
  keywordDetail: KeywordDetail | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  private realtimeSubscription: Subscription | undefined;

  constructor(private route: ActivatedRoute, private http: HttpClient, private location: Location, private sanitizer: DomSanitizer, private realtimeService: RealtimeService) { }

  ngOnInit(): void {
    this.keywordId = this.route.snapshot.paramMap.get('id');
    if (this.keywordId) {
      this.fetchKeywordDetails(this.keywordId);
    }

    this.realtimeSubscription = this.realtimeService.onScrapeAttemptCreate().subscribe(updatedAttempt => {
      if (this.keywordDetail && updatedAttempt.keywordId === this.keywordDetail.id) {
        const index = this.keywordDetail.scrapeAttempts.findIndex(att => att.id === updatedAttempt.id);
        if (index !== -1) {
          this.keywordDetail.scrapeAttempts[index] = { ...this.keywordDetail.scrapeAttempts[index], ...updatedAttempt };
        } else {
          // If it's a new attempt for this keyword, add it
          this.keywordDetail.scrapeAttempts.push(updatedAttempt);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.realtimeSubscription?.unsubscribe();
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
