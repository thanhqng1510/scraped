import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Keyword {
  id: string;
  text: string;
  status: string;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface KeywordsResponse {
  data: Keyword[];
  pagination: Pagination;
}

@Injectable({
  providedIn: 'root'
})
export class KeywordService {
  private apiUrl = '/api/v1/keywords';

  private keywordsSubject = new BehaviorSubject<KeywordsResponse | null>(null);
  public keywords$ = this.keywordsSubject.asObservable();

  private currentPage = 1;
  private currentLimit = 10;
  private currentSearchTerm: string = '';

  constructor(private http: HttpClient) { }

  loadKeywords(page: number = this.currentPage, limit: number = this.currentLimit, searchTerm?: string): void {
    this.currentPage = page;
    this.currentLimit = limit;
    if (searchTerm !== undefined) {
      this.currentSearchTerm = searchTerm;
    }

    let params = new HttpParams()
      .set('page', this.currentPage)
      .set('limit', this.currentLimit);
    if (this.currentSearchTerm) {
      params = params.set('search', this.currentSearchTerm);
    }

    this.http.get<KeywordsResponse>(this.apiUrl, { params }).pipe(
      tap(response => this.keywordsSubject.next(response))
    ).subscribe();
  }

  refreshKeywords(): void {
    this.loadKeywords(this.currentPage, this.currentLimit);
  }

  setSearchTerm(term: string): void {
    this.currentSearchTerm = term;
    this.loadKeywords(1, this.currentLimit); // Reset to page 1 on new search
  }
}