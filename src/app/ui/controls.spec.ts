import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { byLabel, click, key, pointer } from '../../testing/dom';
import { HoldRepeat } from './hold-repeat';
import { NumberStepper } from './number-stepper';
import type { PillOption } from './segmented-pills';
import { SegmentedPills } from './segmented-pills';
import { ToggleSwitch } from './toggle-switch';

@Component({
  imports: [SegmentedPills],
  template: `<app-segmented-pills
    label="Size"
    [options]="options"
    [disabled]="disabled()"
    [(value)]="value"
  />`,
})
class PillsHost {
  readonly options: PillOption<string>[] = [
    { value: 's', label: 'Small' },
    { value: 'm', label: 'Medium' },
    { value: 'l', label: 'Large' },
  ];
  readonly value = signal('m');
  readonly disabled = signal(false);
}

describe('SegmentedPills', () => {
  it('is a labelled radio group with the selection checked', async () => {
    const fixture = TestBed.createComponent(PillsHost);
    await fixture.whenStable();
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(group.getAttribute('aria-label')).toBe('Size');
    const radios = [...group.querySelectorAll('[role="radio"]')] as HTMLButtonElement[];
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('selects on click', async () => {
    const fixture = TestBed.createComponent(PillsHost);
    await fixture.whenStable();
    await click(fixture, byLabel(fixture.nativeElement, 'Large'));
    expect(fixture.componentInstance.value()).toBe('l');
  });

  it('moves the selection and focus with the arrow keys, wrapping around', async () => {
    const fixture = TestBed.createComponent(PillsHost);
    await fixture.whenStable();
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]') as HTMLElement;
    key(group, 'ArrowRight');
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('l');
    expect(document.activeElement?.textContent.trim()).toBe('Large');
    key(group, 'ArrowDown');
    expect(fixture.componentInstance.value()).toBe('s');
    key(group, 'ArrowLeft');
    expect(fixture.componentInstance.value()).toBe('l');
    key(group, 'ArrowUp');
    expect(fixture.componentInstance.value()).toBe('m');
    const other = key(group, 'Enter');
    expect(other.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.value()).toBe('m');
  });

  it('can be disabled', async () => {
    const fixture = TestBed.createComponent(PillsHost);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(group.getAttribute('aria-disabled')).toBe('true');
    expect([...group.querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
  });
});

@Component({
  imports: [NumberStepper],
  template: `<app-number-stepper
    label="Bars"
    unit=" bars"
    [steps]="steps()"
    [min]="1"
    [max]="20"
    [disabled]="disabled()"
    [(value)]="value"
  />`,
})
class StepperHost {
  readonly value = signal(5);
  readonly steps = signal<readonly number[]>([1, 10]);
  readonly disabled = signal(false);
}

describe('NumberStepper', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(StepperHost);
    await fixture.whenStable();
    const host = fixture.nativeElement.querySelector('app-number-stepper') as HTMLElement;
    return { fixture, host, value: fixture.componentInstance.value };
  };

  it('exposes a spin button with value, range and unit', async () => {
    const { host } = await setup();
    expect(host.getAttribute('role')).toBe('spinbutton');
    expect(host.getAttribute('aria-label')).toBe('Bars');
    expect(host.getAttribute('aria-valuenow')).toBe('5');
    expect(host.getAttribute('aria-valuemin')).toBe('1');
    expect(host.getAttribute('aria-valuemax')).toBe('20');
    expect(host.getAttribute('aria-valuetext')).toBe('5 bars');
    expect([...host.querySelectorAll('button')].map((b) => b.textContent.trim())).toEqual([
      '−10',
      '−1',
      '+1',
      '+10',
    ]);
  });

  it('steps with its buttons and stays within the range', async () => {
    const { fixture, host, value } = await setup();
    pointer(byLabel(host, 'Plus 10'), 'pointerdown', { button: 0 });
    pointer(byLabel(host, 'Plus 10'), 'pointerup');
    await fixture.whenStable();
    expect(value()).toBe(15);
    byLabel(host, 'Plus 10').click();
    await fixture.whenStable();
    expect(value()).toBe(15);
    pointer(byLabel(host, 'Plus 10'), 'pointerdown', { button: 0 });
    pointer(byLabel(host, 'Plus 10'), 'pointerup');
    await fixture.whenStable();
    expect(value()).toBe(20);
    expect((byLabel(host, 'Plus 1') as HTMLButtonElement).disabled).toBe(true);
    expect((byLabel(host, 'Minus 1') as HTMLButtonElement).disabled).toBe(false);
  });

  it('steps with the keyboard', async () => {
    const { host, value } = await setup();
    key(host, 'ArrowUp');
    key(host, 'ArrowRight');
    expect(value()).toBe(7);
    key(host, 'ArrowDown');
    key(host, 'ArrowLeft');
    expect(value()).toBe(5);
    key(host, 'PageUp');
    expect(value()).toBe(15);
    key(host, 'PageDown');
    key(host, 'PageDown');
    expect(value()).toBe(1);
    expect(key(host, 'a').defaultPrevented).toBe(false);
  });

  it('keeps arrow keys from reaching the page shortcuts', async () => {
    const { host } = await setup();
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    key(host, 'ArrowLeft');
    document.removeEventListener('keydown', outside);
    expect(outside).not.toHaveBeenCalled();
  });

  it('ignores input while disabled', async () => {
    const { fixture, host, value } = await setup();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    key(host, 'ArrowUp');
    expect(value()).toBe(5);
    expect(host.getAttribute('aria-disabled')).toBe('true');
    expect([...host.querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
  });

  it('is unbounded without min and max', async () => {
    @Component({
      imports: [NumberStepper],
      template: `<app-number-stepper label="Any" [(value)]="value" />`,
    })
    class Unbounded {
      readonly value = signal(0);
    }
    const fixture = TestBed.createComponent(Unbounded);
    await fixture.whenStable();
    const host = fixture.nativeElement.querySelector('app-number-stepper') as HTMLElement;
    key(host, 'ArrowDown');
    expect(fixture.componentInstance.value()).toBe(-1);
    key(host, 'PageUp');
    expect(fixture.componentInstance.value()).toBe(0);
  });
});

@Component({
  imports: [ToggleSwitch],
  template: `<app-toggle-switch label="Vibration" [disabled]="disabled()" [(checked)]="on" />`,
})
class SwitchHost {
  readonly on = signal(false);
  readonly disabled = signal(false);
}

describe('ToggleSwitch', () => {
  it('is a labelled switch that flips on click', async () => {
    const fixture = TestBed.createComponent(SwitchHost);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Vibration');
    expect(button.getAttribute('aria-checked')).toBe('false');
    await click(fixture, button);
    expect(fixture.componentInstance.on()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
    await click(fixture, button);
    expect(fixture.componentInstance.on()).toBe(false);
  });

  it('can be disabled', async () => {
    const fixture = TestBed.createComponent(SwitchHost);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement.querySelector('[role="switch"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

@Component({
  imports: [HoldRepeat],
  template: `<button type="button" appHoldRepeat (repeat)="count = count + 1">+</button>`,
})
class HoldHost {
  count = 0;
}

describe('HoldRepeat', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const fixture = TestBed.createComponent(HoldHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, button, count: () => fixture.componentInstance.count };
  };

  it('fires once on a press, then repeats after 400 ms every 80 ms', () => {
    const { button, count } = setup();
    pointer(button, 'pointerdown', { button: 0 });
    expect(count()).toBe(1);
    vi.advanceTimersByTime(399);
    expect(count()).toBe(1);
    vi.advanceTimersByTime(1 + 80 * 3);
    expect(count()).toBe(5);
    pointer(button, 'pointerup');
    vi.advanceTimersByTime(1000);
    expect(count()).toBe(5);
  });

  it('does not count the click that follows a press', () => {
    const { button, count } = setup();
    pointer(button, 'pointerdown', { button: 0 });
    pointer(button, 'pointerup');
    button.click();
    expect(count()).toBe(1);
  });

  it('counts keyboard clicks', () => {
    const { button, count } = setup();
    button.click();
    button.click();
    expect(count()).toBe(2);
  });

  it('ignores secondary buttons and stops when the pointer leaves or is cancelled', () => {
    const { button, count } = setup();
    pointer(button, 'pointerdown', { button: 2 });
    expect(count()).toBe(0);
    pointer(button, 'pointerdown', { button: 0 });
    pointer(button, 'pointerleave');
    vi.advanceTimersByTime(1000);
    expect(count()).toBe(1);
    pointer(button, 'pointerdown', { button: 0 });
    pointer(button, 'pointercancel');
    vi.advanceTimersByTime(1000);
    expect(count()).toBe(2);
  });

  it('suppresses the long-press menu', () => {
    const { button } = setup();
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('stops repeating when destroyed mid-press', () => {
    const { fixture, button, count } = setup();
    pointer(button, 'pointerdown', { button: 0 });
    fixture.destroy();
    vi.advanceTimersByTime(1000);
    expect(count()).toBe(1);
  });
});
