import { Component, VERSION } from '@angular/core';
import { ApiSection } from './sections/api-section';
import { ProofSection } from './sections/proof-section';
import { RawHtmlSection } from './sections/raw-html-section';
import { StatusBanner } from './sections/status-banner';

/** Shell only. Every demonstration lives in a section component. */
@Component({
  selector: 'app-root',
  imports: [StatusBanner, ProofSection, RawHtmlSection, ApiSection],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly angularVersion = VERSION.major;
}
