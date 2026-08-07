import { TestBed } from '@angular/core/testing';
import { provideNoAi } from '@pacyfist/no-ai';
import { describe, expect, it } from 'vitest';
import { ApiSection } from './api-section';

function setup(disabled = true) {
  TestBed.configureTestingModule({
    providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled })],
  });
  const fixture = TestBed.createComponent(ApiSection);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ApiSection', () => {
  it('demonstrates all three template APIs', () => {
    expect(setup().querySelectorAll('.api-demo').length).toBe(3);
  });

  it('shows the source for each demo', () => {
    const snippets = [...setup().querySelectorAll('pre')].map((p) => p.textContent ?? '');

    expect(snippets.some((s) => s.includes('<p noAi>'))).toBe(true);
    expect(snippets.some((s) => s.includes('[noAi]='))).toBe(true);
    expect(snippets.some((s) => s.includes('| noAi'))).toBe(true);
  });

  it('hides every protected demo from assistive technology', () => {
    expect(setup().querySelectorAll('.api-demo[aria-hidden="true"]').length).toBe(3);
  });

  it('describes the specimens for screen readers without reproducing them', () => {
    const el = setup(false);
    const note = el.querySelector('.sr-only') as HTMLElement;

    expect(note.textContent).toContain('deliberately unreadable');
    expect(note.textContent).not.toContain('takes the element');
  });

  it('explains why the pipe needs noAiFont instead of the directive', () => {
    expect(setup().textContent).toContain('textContent');
  });
});
