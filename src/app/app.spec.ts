import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    });
  });

  it('shows the metronome tab first on phones', async () => {
    const harness = await RouterTestingHarness.create('/');
    const fixture = TestBed.createComponent(App);
    await harness.navigateByUrl('/');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const tabs = [...element.querySelectorAll('nav a')].map((link) => link.textContent?.trim());
    expect(tabs).toEqual(['Metronome', 'Tuner']);
    expect(element.querySelector('[aria-current="page"]')?.textContent).toContain('Metronome');
  });
});
