import { TestBed } from '@angular/core/testing';
import { provideNoAi } from '@pacyfist/no-ai';
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
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('leaves the unprotected headline readable', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain("Text a scraper can't read");
  });

  it('shows the reader panel and the scraper panel', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.protected-body')).toBeTruthy();
    expect(compiled.querySelector('.dom-dump')).toBeTruthy();
  });
});
