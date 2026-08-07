import { Component, VERSION } from '@angular/core';
import { ProofSection } from './sections/proof-section';
import { RawHtmlSection } from './sections/raw-html-section';
import { StatusBanner } from './sections/status-banner';

/** Shell only. Every demonstration lives in a section component. */
@Component({
  selector: 'app-root',
  imports: [StatusBanner, ProofSection, RawHtmlSection],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly angularVersion = VERSION.major;
}
