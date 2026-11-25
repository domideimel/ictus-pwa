import type { Type } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

/** Finds an element by its accessible name (aria-label or text) and role-ish selector. */
export function byLabel(
  root: ParentNode,
  label: string | RegExp,
  selector = 'button',
): HTMLElement {
  const match = (text: string | null | undefined): boolean =>
    text !== null &&
    text !== undefined &&
    (typeof label === 'string' ? text.trim() === label : label.test(text.trim()));
  const found = [...root.querySelectorAll<HTMLElement>(selector)].find(
    (element) => match(element.getAttribute('aria-label')) || match(element.textContent),
  );
  if (!found) throw new Error(`No ${selector} labelled ${label}`);
  return found;
}

/** A label's text as assistive tech reads it: without its `aria-hidden` parts (icons, note symbols). */
function spokenText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => {
    hidden.remove();
  });
  return copy.textContent.replace(/\s+/g, ' ').trim();
}

/** The native radio (or checkbox) inside the `<label>` that reads `label`, e.g. a segment. */
export function radio(root: ParentNode, label: string): HTMLInputElement {
  const found = [...root.querySelectorAll('label')].find(
    (element) => spokenText(element) === label,
  );
  const input = found?.querySelector('input');
  if (!input) throw new Error(`No radio labelled ${label}`);
  return input;
}

/** All radios in `root`, named by their labels as assistive tech reads them. */
export function radioNames(root: ParentNode): string[] {
  return [...root.querySelectorAll('input[type="radio"]')].map((input) =>
    spokenText(input.closest('label')!),
  );
}

function labelled(root: ParentNode, label: string): Element {
  const found = [...root.querySelectorAll('label')].find(
    (element) => element.textContent.replace(/\s+/g, ' ').trim() === label && element.htmlFor,
  );
  const target = found && root.querySelector(`#${CSS.escape(found.htmlFor)}`);
  if (!target) throw new Error(`No control labelled ${label}`);
  return target;
}

/** The input a `<label for>` that reads `label` points to: a switch or a number field's input. */
export function control(root: ParentNode, label: string): HTMLInputElement {
  const target = labelled(root, label);
  if (!(target instanceof HTMLInputElement)) throw new Error(`${label} is not an input`);
  return target;
}

/** The `<select>` a `<label for>` that reads `label` points to. */
export function selectControl(root: ParentNode, label: string): HTMLSelectElement {
  const target = labelled(root, label);
  if (!(target instanceof HTMLSelectElement)) throw new Error(`${label} is not a select`);
  return target;
}

/** Presses and releases the + or − button of the `lg-number-field` around `input`. */
export function pressStep(input: HTMLElement, direction: 'increase' | 'decrease'): void {
  const button = input.closest('lg-number-field')?.querySelector(`[data-lg-part="${direction}"]`);
  if (!button) throw new Error(`No ${direction} button`);
  pointer(button, 'pointerdown', { button: 0 });
  pointer(button, 'pointerup');
}

export function queryAllText(root: ParentNode, selector: string): string[] {
  return [...root.querySelectorAll(selector)].map((element) =>
    element.textContent.replace(/\s+/g, ' ').trim(),
  );
}

export function key(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

/** Clicks and waits for the view to render the result. */
export async function click(
  fixture: ComponentFixture<unknown>,
  element: HTMLElement,
): Promise<void> {
  element.click();
  await fixture.whenStable();
}

/** jsdom has no PointerEvent; a MouseEvent with the pointer fields is enough for the handlers. */
export function pointer(
  target: Element,
  type: string,
  init: { clientX?: number; clientY?: number; button?: number; pointerId?: number } = {},
): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  target.dispatchEvent(event);
}

/** Creates a component and waits for its first render. */
export async function render<T>(
  component: Type<T>,
): Promise<{ fixture: ComponentFixture<T>; element: HTMLElement }> {
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}
