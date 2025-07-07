import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { publicGuard } from './public.guard';
import { AuthService } from '../services/auth.service';

describe('publicGuard', () => {
  // Helper function to execute the guard within an injection context
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => publicGuard(...guardParameters));

  let router: Router;

  const mockAuthService = {
    isAuthenticated: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('should allow activation when user is not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    const canActivate = executeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);
    expect(canActivate).toBe(true);
  });

  it('should prevent activation and navigate to /dashboard when user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    const navigateSpy = jest.spyOn(router, 'navigate');
    const canActivate = executeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);
    expect(canActivate).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});