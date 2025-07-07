import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { RealtimeService } from './realtime.service';
import { AuthService } from './auth.service';
import { Subscription } from 'rxjs';

// A mock EventSource to simulate SSE behavior in tests
class MockEventSource {
  onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;
  onerror: ((this: EventSource, ev: Event) => any) | null = null;
  onopen: ((this: EventSource, ev: Event) => any) | null = null;
  private listeners = new Map<string, ((event: any) => void)[]>();

  // Add properties to satisfy the EventSource interface for the 'this' context.
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;
  readyState: number;
  withCredentials = false;

  constructor(public url: string) {
    this.readyState = this.CONNECTING;
  }

  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }

  close(): void {
    this.readyState = this.CLOSED;
  }

  // Helper to simulate a named event from the server
  emit(type: string, data: any): void {
    const event = { data: JSON.stringify(data) };
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => listener(event));
    }
  }

  // Helper to simulate an error
  emitError(error: any): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('RealtimeService', () => {
  let service: RealtimeService;
  let authServiceMock: jest.Mocked<AuthService>;
  let mockEventSource: MockEventSource;
  let subscriptions: Subscription;

  beforeEach(() => {
    const authSpy = {
      getToken: jest.fn(),
    };
    subscriptions = new Subscription();

    TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        { provide: AuthService, useValue: authSpy },
        { provide: NgZone, useValue: new NgZone({ enableLongStackTrace: false }) }
      ]
    });

    service = TestBed.inject(RealtimeService);
    authServiceMock = TestBed.inject(AuthService) as jest.Mocked<AuthService>;

    // Mock the global EventSource before each test
    Object.defineProperty(window, 'EventSource', {
      writable: true,
      value: jest.fn().mockImplementation((url: string | URL) => {
        mockEventSource = new MockEventSource(url.toString());
        jest.spyOn(mockEventSource, 'close');
        return mockEventSource as any;
      }),
    });
  });

  afterEach(() => {
    subscriptions.unsubscribe();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Connection Management', () => {
    it('should not connect if no token is available', () => {
      authServiceMock.getToken.mockReturnValue(null);
      subscriptions.add(service.onKeywordUpdate().subscribe());
      expect(window.EventSource).not.toHaveBeenCalled();
    });

    it('should connect on the first subscription with a valid token', () => {
      authServiceMock.getToken.mockReturnValue('test-token');
      subscriptions.add(service.onKeywordUpdate().subscribe());
      expect(window.EventSource).toHaveBeenCalledWith('/api/v1/events?token=test-token');
    });

    it('should not create a new connection on a second subscription', () => {
      authServiceMock.getToken.mockReturnValue('test-token');
      subscriptions.add(service.onKeywordUpdate().subscribe());
      subscriptions.add(service.onScrapeAttemptCreate().subscribe());

      expect(window.EventSource).toHaveBeenCalledTimes(1);
    });

    it('should disconnect when the last subscriber unsubscribes', () => {
      authServiceMock.getToken.mockReturnValue('test-token');
      const sub1 = service.onKeywordUpdate().subscribe();
      const sub2 = service.onScrapeAttemptCreate().subscribe();

      sub1.unsubscribe();
      expect(mockEventSource.close).not.toHaveBeenCalled();

      sub2.unsubscribe();
      expect(mockEventSource.close).toHaveBeenCalledTimes(1);
    });
  });

  it('should receive and parse keyword_update events', (done) => {
    const mockData = { id: '1', text: 'test', status: 'completed' };
    authServiceMock.getToken.mockReturnValue('test-token');

    subscriptions.add(service.onKeywordUpdate().subscribe(data => {
      expect(data).toEqual(mockData);
      done();
    }));

    mockEventSource.emit('keyword_update', mockData);
  });

  it('should receive and parse scrape_attempt_create events', (done) => {
    const mockData = { id: 'sa1', status: 'success' };
    authServiceMock.getToken.mockReturnValue('test-token');

    subscriptions.add(service.onScrapeAttemptCreate().subscribe(data => {
      expect(data).toEqual(mockData);
      done();
    }));

    mockEventSource.emit('scrape_attempt_create', mockData);
  });
});