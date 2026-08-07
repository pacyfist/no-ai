import { TestBed } from '@angular/core/testing';
import { NoAiFontService, provideNoAi } from '@pacyfist/no-ai';
import { describe, expect, it } from 'vitest';
import { PROTECTED_ARTICLE, ProofSection } from './proof-section';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled: true })],
  });
  const fixture = TestBed.createComponent(ProofSection);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('ProofSection', () => {
  it('offers a paste target and the protected paragraph', () => {
    const { el } = setup();
    expect(el.querySelector('.protected-body')).toBeTruthy();
    expect(el.querySelector('textarea.dom-dump')).toBeTruthy();
  });

  it('hides the protected paragraph from assistive technology', () => {
    const { el } = setup();
    const protectedEl = el.querySelector('.protected-body') as HTMLElement;

    expect(protectedEl.getAttribute('aria-hidden')).toBe('true');
  });

  it('describes the specimen for screen readers without reproducing it', () => {
    const { el } = setup();
    const note = el.querySelector('.sr-only') as HTMLElement;

    expect(note.textContent).toContain('deliberately unreadable');
    // A readable copy would sit in the served HTML for any scraper to take,
    // which would defeat the entire technique.
    expect(note.textContent).not.toContain(PROTECTED_ARTICLE);
  });

  it('never renders the article in readable form anywhere in the section', () => {
    // `disabled: false` is the shipping path — assert against that, not the
    // fail-open path the other tests use.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 7, disabled: false })],
    });
    const fixture = TestBed.createComponent(ProofSection);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('quick brown fox');
  });

  it('labels the panel for the reveal state', () => {
    const { fixture, el } = setup();
    const title = () => el.querySelector('.card-title')?.textContent?.trim();

    expect(title()).toBe('What a human reads');

    TestBed.inject(NoAiFontService).revealed.set(true);
    fixture.detectChanges();
    expect(title()).toBe('What a scraper sees');
  });

  it('flags a paste that came through intact', () => {
    const { fixture, el } = setup();
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = PROTECTED_ARTICLE;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.textContent).toContain('came through intact');
  });

  it('flags a paste that arrived scrambled', () => {
    const { fixture, el } = setup();
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = "Kf~0 |0#: e(0 9'6Z";
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.textContent).toContain('unusable');
  });

  it('clears the paste', () => {
    const { fixture, el } = setup();
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = 'anything';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });
});
