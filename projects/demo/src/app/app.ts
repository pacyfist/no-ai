import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApplyTabs } from './sections/apply-tabs';
import { CipherTable } from './sections/cipher-table';
import { HeroMirror } from './sections/hero-mirror';
import { ServedSource } from './sections/served-source';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroMirror, CipherTable, ServedSource, ApplyTabs],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
