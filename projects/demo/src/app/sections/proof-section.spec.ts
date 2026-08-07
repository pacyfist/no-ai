import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  function paste(fixture: ComponentFixture<ProofSection>, el: HTMLElement, value: string) {
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('flags a whole-article paste that came through readable', () => {
    const { fixture, el } = setup();
    paste(fixture, el, PROTECTED_ARTICLE);
    expect(el.textContent).toContain('came through readable');
  });

  it('flags a PARTIAL readable paste as readable, not unusable', () => {
    // The common case: a visitor drags across a line or two. Comparing the
    // paste to the whole article labelled this "unusable" — the opposite of
    // the truth, in the one interaction this page exists for.
    const { fixture, el } = setup();
    paste(fixture, el, 'Pack my box with five dozen liquor jugs');

    expect(el.textContent).toContain('came through readable');
    expect(el.textContent).not.toContain('unusable');
  });

  it('flags a partial scrambled paste as unusable', () => {
    // Needs protection actually on: with `disabled: true` the service's
    // scramble() is the identity, so this branch could never be reached.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 3, disabled: false })],
    });
    const fixture = TestBed.createComponent(ProofSection);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const ciphered = TestBed.inject(NoAiFontService).scramble(PROTECTED_ARTICLE);
    paste(fixture, el, ciphered.slice(20, 60));

    expect(el.textContent).toContain('unusable');
  });

  it('says so when the paste came from somewhere else entirely', () => {
    const { fixture, el } = setup();
    paste(fixture, el, 'a sentence that appears nowhere in the specimen');
    expect(el.textContent).toContain('not from the paragraph');
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
