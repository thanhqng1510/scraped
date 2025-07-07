import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the header component', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const headerElement = fixture.debugElement.query(By.css('app-header'));
    expect(headerElement).toBeTruthy();
  });

  it('should render the router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const routerOutletElement = fixture.debugElement.query(By.directive(RouterOutlet));
    expect(routerOutletElement).toBeTruthy();
  });
});
