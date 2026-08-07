import { TestBed } from '@angular/core/testing';
import { provideNoAi } from '@pacyfist/no-ai';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        // jsdom has no FontFace, so the real font never loads here. `disabled`
        // keeps the component on the fail-open path instead of racing it.
        provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled: true }),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('leaves the unprotected headline readable', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      "Text a scraper can't read",
    );
  });

  it('composes the sections it owns', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    for (const selector of ['app-status-banner', 'app-proof-section']) {
      expect(el.querySelector(selector), selector).toBeTruthy();
    }
  });
});
