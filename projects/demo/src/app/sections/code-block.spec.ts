import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CodeBlock } from './code-block';

@Component({
  template: `<app-code-block [code]="snippet" language="ts" />`,
  imports: [CodeBlock],
})
class Host {
  readonly snippet = '<p noAi>Hello</p>';
}

describe('CodeBlock', () => {
  it('renders the snippet verbatim without interpreting it as markup', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const pre = fixture.nativeElement.querySelector('pre') as HTMLElement;

    expect(pre.textContent?.trim()).toBe('<p noAi>Hello</p>');
    expect(pre.querySelector('p')).toBeNull();
  });

  it('labels the snippet with its language', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ts');
  });

  it('defaults the language label to html', () => {
    @Component({ template: `<app-code-block code="<p noAi>x</p>" />`, imports: [CodeBlock] })
    class DefaultHost {}

    const fixture = TestBed.createComponent(DefaultHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('html');
  });
});
