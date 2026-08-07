import { Component, Type, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { NoAiDirective } from './no-ai.directive';
import { NoAiFontService } from './no-ai-font.service';
import { buildScrambleMap, scrambleText } from './scramble-map';

const MAP = buildScrambleMap(2024);

/**
 * Stands in for the real service so directive behaviour can be asserted without
 * a font fetch — jsdom has no FontFace. The real loading path is covered by
 * scripts/verify-in-browser.mjs against Chrome.
 */
function fakeService(overrides: Record<string, unknown> = {}) {
  return {
    map: MAP,
    familyName: 'FakeNoAi',
    ready: signal(true),
    failed: signal<string | null>(null),
    revealed: signal(false),
    active: signal(true),
    fontStack: signal('"FakeNoAi", sans-serif'),
    hidden: signal(false),
    scramble: (text: string) => scrambleText(text, MAP),
    ...overrides,
  };
}

// Templates must be literals for the AOT compiler, so each shape gets a host.
@Component({ template: '<p noAi>Hello, world</p>', imports: [NoAiDirective] })
class StaticHost {}

@Component({ template: '<p [noAi]="body()"></p>', imports: [NoAiDirective] })
class BoundHost {
  readonly body = signal('Hello, world');
}

function setup<T>(host: Type<T>, service: Record<string, unknown> = fakeService()) {
  TestBed.configureTestingModule({
    providers: [{ provide: NoAiFontService, useValue: service }],
  });
  const fixture: ComponentFixture<T> = TestBed.createComponent(host);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement.querySelector('p') as HTMLElement };
}

describe('NoAiDirective', () => {
  it('scrambles the text the element already contains', () => {
    const { el } = setup(StaticHost);
    expect(el.textContent).not.toContain('Hello');
    expect(el.textContent).toBe(scrambleText('Hello, world', MAP));
  });

  it('scrambles a bound string', () => {
    const { el } = setup(BoundHost);
    expect(el.textContent).toBe(scrambleText('Hello, world', MAP));
  });

  it('points the element at the generated font', () => {
    const { el } = setup(StaticHost);
    expect(el.style.fontFamily).toContain('FakeNoAi');
  });

  it('hides the text until the font is ready, then reveals it', () => {
    const service = fakeService({ hidden: signal(true) });
    const { fixture, el } = setup(StaticHost, service);

    expect(el.style.visibility).toBe('hidden');

    (service.hidden as WritableSignal<boolean>).set(false);
    fixture.detectChanges();
    expect(el.style.visibility).toBe('');
  });

  it('fails open — leaves readable text when the font could not be built', () => {
    const { el } = setup(
      StaticHost,
      fakeService({
        failed: signal('boom'),
        active: signal(false),
        scramble: (text: string) => text,
        fontStack: signal('sans-serif'),
      }),
    );
    expect(el.textContent).toBe('Hello, world');
  });

  it('re-scrambles when the bound text changes', () => {
    const { fixture, el } = setup(BoundHost);
    expect(el.textContent).toBe(scrambleText('Hello, world', MAP));

    fixture.componentInstance.body.set('something else');
    fixture.detectChanges();
    expect(el.textContent).toBe(scrambleText('something else', MAP));
  });
});
