import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
