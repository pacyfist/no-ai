import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CipherTable } from './sections/cipher-table';
import { HeroMirror } from './sections/hero-mirror';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroMirror, CipherTable],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
