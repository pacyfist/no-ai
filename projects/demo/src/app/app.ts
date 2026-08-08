import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApplyTabs } from './sections/apply-tabs';
import { Bench } from './sections/bench';
import { BeyondAngular } from './sections/beyond-angular';
import { Breakage } from './sections/breakage';
import { CipherTable } from './sections/cipher-table';
import { Costs } from './sections/costs';
import { HeroMirror } from './sections/hero-mirror';
import { ServedSource } from './sections/served-source';
import { TakeIt } from './sections/take-it';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroMirror,
    CipherTable,
    ServedSource,
    ApplyTabs,
    Bench,
    Breakage,
    Costs,
    BeyondAngular,
    TakeIt,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
