import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroMirror } from './sections/hero-mirror';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroMirror],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
