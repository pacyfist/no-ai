import { TestBed } from '@angular/core/testing';
import { NoAiFontService, provideNoAi } from '@pacyfist/no-ai';
import { describe, expect, it } from 'vitest';
import { StatusBanner } from './status-banner';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled: true })],
  });
  const fixture = TestBed.createComponent(StatusBanner);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('StatusBanner', () => {
  it('reports the generated font once it is ready', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Protection active');
    expect(el.textContent).toContain(TestBed.inject(NoAiFontService).familyName);
  });

  it('reports the reason when the font could not be built', () => {
    const { fixture, el } = setup();
    TestBed.inject(NoAiFontService).failed.set('no FontFace in jsdom');
    fixture.detectChanges();

    expect(el.textContent).toContain('Protection off');
    expect(el.textContent).toContain('no FontFace in jsdom');
  });

  it('drives the reveal signal from the toggle', () => {
    const { fixture, el } = setup();
    const service = TestBed.inject(NoAiFontService);
    const toggle = el.querySelector('input[type=checkbox]') as HTMLInputElement;

    expect(service.revealed()).toBe(false);

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(service.revealed()).toBe(true);
  });
});
