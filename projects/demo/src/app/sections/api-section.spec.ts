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

  it('pairs every protected demo with an accessible copy', () => {
    const el = setup();
    expect(el.querySelectorAll('.api-demo[aria-hidden="true"]').length).toBe(3);
    expect(el.querySelectorAll('.sr-only').length).toBe(3);
  });

  it('explains why the pipe needs noAiFont instead of the directive', () => {
    expect(setup().textContent).toContain('textContent');
  });
});
