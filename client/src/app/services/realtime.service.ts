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
  private refCount = 0; // Tracks active subscribers

  constructor(private authService: AuthService, private ngZone: NgZone) {}

  private _connect(): void {
    if (this.eventSource) {
      return; // Already connected
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('No authentication token found for SSE connection.');
      return;
    }

    this.eventSource = new EventSource(`/api/v1/events?token=${token}`);

    this.eventSource.onmessage = (event) => {
      this.ngZone.run(() => {
        console.log('SSE message:', event.data);
      });
    };

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
        // EventSource automatically tries to reconnect
      });
    };

    console.log('SSE connection established.');
  }

  private _disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
      console.log('SSE connection closed.');
    }
  }

  onKeywordUpdate(): Observable<any> {
    return new Observable(subscriber => {
      this.refCount++;
      if (this.refCount === 1) {
        this._connect();
      }
      const subscription = this.keywordUpdateSubject.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        this.refCount--;
        if (this.refCount === 0) {
          this._disconnect();
        }
      };
    });
  }

  onScrapeAttemptCreate(): Observable<any> {
    return new Observable(subscriber => {
      this.refCount++;
      if (this.refCount === 1) {
        this._connect();
      }
      const subscription = this.scrapeAttemptCreateSubject.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        this.refCount--;
        if (this.refCount === 0) {
          this._disconnect();
        }
      };
    });
  }
}