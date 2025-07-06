import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { HeaderComponent } from './header';
import { AuthService } from '../auth/auth.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authService: AuthService;
  let router: Router;

  // Mock services
  const mockAuthService = {
    isAuthenticated: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HeaderComponent,
        RouterTestingModule.withRoutes([]) // Set up router testing module
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    jest.clearAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      fixture.detectChanges();
    });

    it('should display the navigation bar', () => {
      const navElement = fixture.debugElement.query(By.css('nav'));
      expect(navElement).toBeTruthy();
    });

    it('should display dashboard and API key links', () => {
      const links = fixture.debugElement.queryAll(By.css('nav a'));
      const linkTexts = links.map(link => link.nativeElement.textContent);
      expect(linkTexts).toContain('Dashboard');
      expect(linkTexts).toContain('API Key');
    });

    it('should call authService.logout and navigate on logout click', () => {
      const navigateSpy = jest.spyOn(router, 'navigate');
      const logoutButton = fixture.debugElement.query(By.css('nav button'));
      logoutButton.triggerEventHandler('click', null);

      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      fixture.detectChanges();
    });

    it('should not display the navigation bar', () => {
      const navElement = fixture.debugElement.query(By.css('nav'));
      expect(navElement).toBeFalsy();
    });
  });
});