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

  it('hides the protected paragraph from assistive technology and offers a readable copy', () => {
    const { el } = setup();
    const protectedEl = el.querySelector('.protected-body') as HTMLElement;
    const readable = el.querySelector('.sr-only') as HTMLElement;

    expect(protectedEl.getAttribute('aria-hidden')).toBe('true');
    expect(readable.textContent).toContain(PROTECTED_ARTICLE);
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
