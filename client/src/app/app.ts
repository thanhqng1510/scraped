import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header';
import { RealtimeService } from './services/realtime.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private realtimeService: RealtimeService) {}

  ngOnInit(): void {
    this.realtimeService.connect();
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }
}