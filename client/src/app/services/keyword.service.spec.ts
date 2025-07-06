import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { KeywordService, KeywordsResponse, Keyword } from './keyword.service';

describe('KeywordService', () => {
  let service: KeywordService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [KeywordService]
    });
    service = TestBed.inject(KeywordService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Make sure that there are no outstanding requests.
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadKeywords', () => {
    it('should fetch keywords and update the keywords$ observable', (done) => {
      const mockKeywords: Keyword[] = [
        { id: '1', text: 'angular', status: 'completed', createdAt: new Date().toISOString() },
        { id: '2', text: 'rxjs', status: 'pending', createdAt: new Date().toISOString() }
      ];
      const mockResponse: KeywordsResponse = {
        data: mockKeywords,
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 }
      };

      service.keywords$.subscribe(response => {
        if (response) { // Skip initial null value
          expect(response).toEqual(mockResponse);
          done();
        }
      });

      service.loadKeywords(1, 10);

      const req = httpMock.expectOne('/api/v1/keywords?page=1&limit=10');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include search term in the request when provided', () => {
      const searchTerm = 'angular';
      const mockResponse: KeywordsResponse = {
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
      };

      service.loadKeywords(1, 10, searchTerm);

      const req = httpMock.expectOne(`/api/v1/keywords?page=1&limit=10&search=${searchTerm}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('refreshKeywords', () => {
    it('should re-fetch keywords with the last used parameters', () => {
      const mockResponse: KeywordsResponse = {
        data: [],
        pagination: { total: 0, page: 2, limit: 5, totalPages: 1 }
      };

      // Initial load
      service.loadKeywords(2, 5);
      const initialReq = httpMock.expectOne('/api/v1/keywords?page=2&limit=5');
      initialReq.flush(mockResponse);

      // Refresh
      service.refreshKeywords();
      const refreshReq = httpMock.expectOne('/api/v1/keywords?page=2&limit=5');
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush(mockResponse);
    });
  });

  describe('setSearchTerm', () => {
    it('should fetch keywords with the new search term and reset to page 1', () => {
      const newSearchTerm = 'test';
      const mockResponse: KeywordsResponse = {
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
      };

      // Set some initial state by loading with different params
      service.loadKeywords(3, 10, 'initial');
      const initialReq = httpMock.expectOne('/api/v1/keywords?page=3&limit=10&search=initial');
      initialReq.flush(mockResponse);

      // Set new search term
      service.setSearchTerm(newSearchTerm);
      const req = httpMock.expectOne(`/api/v1/keywords?page=1&limit=10&search=${newSearchTerm}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  it('keywords$ should emit null initially', (done) => {
    service.keywords$.subscribe(value => {
      expect(value).toBeNull();
      done();
    });
  });
});