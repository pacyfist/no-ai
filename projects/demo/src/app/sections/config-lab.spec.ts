import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoAiFontService, provideNoAi } from '@pacyfist/no-ai';
import { describe, expect, it } from 'vitest';
import { LAB_CARDS } from './config-lab';

describe('LAB_CARDS', () => {
  it('covers every configuration option the README documents', () => {
    const keys = LAB_CARDS.flatMap((card) => Object.keys(card.config));

    expect(keys).toContain('seed');
    expect(keys).toContain('disabled');
    expect(keys).toContain('charset');
    expect(keys).toContain('hideUntilReady');
  });

  it('gives every card its own title and snippet', () => {
    expect(new Set(LAB_CARDS.map((c) => c.title)).size).toBe(LAB_CARDS.length);
    expect(LAB_CARDS.every((c) => c.code.includes('provideNoAi'))).toBe(true);
  });

  it('shares one font source across every card', () => {
    const sources = new Set(LAB_CARDS.map((c) => c.config.font));
    expect(sources.size).toBe(1);
  });

  it('builds an isolated service per card, each honouring its own config', () => {
    TestBed.configureTestingModule({
      providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 999, disabled: true })],
    });
    const parent = TestBed.inject(EnvironmentInjector);
    const shell = TestBed.inject(NoAiFontService);

    const services = LAB_CARDS.map((card) =>
      createEnvironmentInjector([provideNoAi(card.config)], parent).get(NoAiFontService),
    );

    // Each card got its own instance, distinct from the shell's.
    expect(new Set(services).size).toBe(LAB_CARDS.length);
    expect(services).not.toContain(shell);

    const pinned = LAB_CARDS.findIndex((c) => c.config.seed === 12345);
    expect(services[pinned].familyName).toBe(`NoAi-${(12345).toString(36)}`);

    const killed = LAB_CARDS.findIndex((c) => c.config.disabled === true);
    expect(services[killed].active()).toBe(false);

    const digits = LAB_CARDS.findIndex((c) => c.config.charset !== undefined);
    expect(services[digits].map.forward.size).toBe(10);
  });
});
