import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

/** Finds an element by its accessible name (aria-label or text) and role-ish selector. */
export function byLabel<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  label: string | RegExp,
  selector = 'button',
): T {
  const match = (text: string | null | undefined): boolean =>
    text !== null &&
    text !== undefined &&
    (typeof label === 'string' ? text.trim() === label : label.test(text.trim()));
  const found = [...root.querySelectorAll<T>(selector)].find(
    (element) => match(element.getAttribute('aria-label')) || match(element.textContent),
  );
  if (!found) throw new Error(`No ${selector} labelled ${label}`);
  return found;
}

export function queryAllText(root: ParentNode, selector: string): string[] {
  return [...root.querySelectorAll(selector)].map((element) =>
    (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
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
