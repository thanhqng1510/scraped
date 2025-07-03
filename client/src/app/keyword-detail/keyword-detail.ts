import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { listAnimation } from '../animations';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoadingComponent } from '../loading/loading';

interface ScrapeAttempt {
  id: number;
  html?: string;
  adCount: number;
  linkCount: number;
  status: string;
  error?: string;
  createdAt: string;
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
  animations: [listAnimation]
})
export class KeywordDetailComponent implements OnInit {
  keywordId: string | null = null;
  keywordDetail: KeywordDetail | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  showHtml: { [key: number]: boolean } = {};

  constructor(private route: ActivatedRoute, private http: HttpClient, private location: Location) { }

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
    } catch (error: any) {
      this.errorMessage = `Failed to load keyword details: ${error.error.message || error.message}`;
      console.error('Error fetching keyword details:', error);
    } finally {
      this.isLoading = false;
    }
  }

  toggleHtml(attemptId: number) {
    this.showHtml[attemptId] = !this.showHtml[attemptId];
  }
}