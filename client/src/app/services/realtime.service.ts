import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private eventSource: EventSource | undefined;
  private keywordUpdateSubject = new Subject<any>();
  private scrapeAttemptCreateSubject = new Subject<any>();

  keywordUpdates$: Observable<any> = this.keywordUpdateSubject.asObservable();
  scrapeAttemptCreate$: Observable<any> = this.scrapeAttemptCreateSubject.asObservable();

  constructor(private authService: AuthService, private ngZone: NgZone) {}

  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('No authentication token found for SSE connection.');
      return;
    }
    
    this.eventSource = new EventSource(`/api/v1/events?token=${token}`);

    this.eventSource.addEventListener('keyword_update', (event) => {
      this.ngZone.run(() => {
        this.keywordUpdateSubject.next(JSON.parse(event.data));
      });
    });

    this.eventSource.addEventListener('scrape_attempt_create', (event) => {
      this.ngZone.run(() => {
        this.scrapeAttemptCreateSubject.next(JSON.parse(event.data));
      });
    });

    this.eventSource.onerror = (error) => {
      this.ngZone.run(() => {
        console.error('SSE Error:', error);
      });
    };
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
      console.log('SSE connection closed.');
    }
  }
}
