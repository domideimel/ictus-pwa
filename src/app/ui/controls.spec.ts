import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { pointer, radio } from '../../testing/dom';
import { HoldRepeat } from './hold-repeat';
import type { PillOption } from './segmented-pills';
import { SegmentedPills } from './segmented-pills';

@Component({
  imports: [SegmentedPills],
  template: `<app-segmented-pills
      label="Size"
      [options]="options"
      [disabled]="disabled()"
      [(value)]="value"
    />
    <app-segmented-pills label="Other" [options]="options" [(value)]="value" />`,
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
  const setup = async () => {
    const fixture = TestBed.createComponent(PillsHost);
    await fixture.whenStable();
    const [group, other] = [...fixture.nativeElement.querySelectorAll('fieldset')] as [
      HTMLFieldSetElement,
      HTMLFieldSetElement,
    ];
    return { fixture, group, other };
  };

  it('is a fieldset of native radios named by its legend, with the selection checked', async () => {
    const { group } = await setup();
    expect(group.querySelector('legend')?.textContent.trim()).toBe('Size');
    const radios = [...group.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
    expect(radios.map((input) => input.checked)).toEqual([false, true, false]);
    // A label around each radio, so the text names it and a tap anywhere on the pill selects it.
    expect(radios.map((input) => input.closest('label')?.textContent.trim())).toEqual([
      'Small',
      'Medium',
      'Large',
    ]);
  });

  it('selects on click and follows the bound value', async () => {
    const { fixture, group } = await setup();
    radio(group, 'Large').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('l');
    fixture.componentInstance.value.set('s');
    await fixture.whenStable();
    expect(radio(group, 'Small').checked).toBe(true);
  });

  it('gives each group its own radio name, so arrow keys stay inside it', async () => {
    const { group, other } = await setup();
    const name = radio(group, 'Small').name;
    expect(name).not.toBe('');
    expect(radio(group, 'Large').name).toBe(name);
    expect(radio(other, 'Small').name).not.toBe(name);
  });

  it('uses compact density, so six options fit on a phone-width row', async () => {
    const { fixture } = await setup();
    const host = fixture.nativeElement.querySelector('app-segmented-pills') as HTMLElement;
    expect(host.dataset['density']).toBe('compact');
  });

  it('can be disabled', async () => {
    const { fixture, group } = await setup();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(group.disabled).toBe(true);
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

  /** The click a browser fires after a pointer press counts the presses in `detail`. */
  const pointerClick = (button: HTMLButtonElement): void => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  };

  it('does not count the click that follows a press', () => {
    const { button, count } = setup();
    pointer(button, 'pointerdown', { button: 0 });
    pointer(button, 'pointerup');
    pointerClick(button);
    expect(count()).toBe(1);
  });

  it('still counts a keyboard click after a press that slid off the button', () => {
    const { button, count } = setup();
    pointer(button, 'pointerdown', { button: 0 });
    pointer(button, 'pointerleave');
    button.click();
    expect(count()).toBe(2);
  });

  it('stops repeating once the button is disabled at its limit', () => {
    const { button, count } = setup();
    pointer(button, 'pointerdown', { button: 0 });
    vi.advanceTimersByTime(400 + 80);
    expect(count()).toBe(3);
    button.disabled = true;
    vi.advanceTimersByTime(80 * 5);
    button.disabled = false;
    vi.advanceTimersByTime(80 * 5);
    expect(count()).toBe(3);
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
