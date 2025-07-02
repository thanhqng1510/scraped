import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Keyword {
  id: number;
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

interface KeywordsResponse {
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

  constructor(private http: HttpClient) { }

  loadKeywords(page: number = this.currentPage, limit: number = this.currentLimit): void {
    this.currentPage = page;
    this.currentLimit = limit;
    this.http.get<KeywordsResponse>(`${this.apiUrl}?page=${page}&limit=${limit}`).pipe(
      tap(response => this.keywordsSubject.next(response))
    ).subscribe();
  }

  refreshKeywords(): void {
    this.loadKeywords(this.currentPage, this.currentLimit);
  }
}