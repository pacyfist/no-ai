import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { InstallSection } from './install-section';

function setup() {
  const fixture = TestBed.createComponent(InstallSection);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('InstallSection', () => {
  it('states the license before the install command', () => {
    const text = setup().textContent ?? '';

    expect(text).toContain('AGPL-3.0-only');
    expect(text.indexOf('AGPL-3.0-only')).toBeLessThan(text.indexOf('npm install'));
  });

  it('warns that the network clause covers a served site', () => {
    expect(setup().textContent).toContain('network');
  });

  it('names opentype.js as a peer dependency and links to the repository', () => {
    const el = setup();
    expect(el.textContent).toContain('opentype.js');
    expect(el.querySelector('a[href*="github.com/pacyfist/no-ai"]')).toBeTruthy();
  });

  it('does not link to npm, since the package is not published', () => {
    expect(setup().querySelector('a[href*="npmjs.com"]')).toBeNull();
  });

  it('opens external links safely', () => {
    for (const link of setup().querySelectorAll('a[target="_blank"]')) {
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });
});
