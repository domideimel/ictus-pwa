/**
 * jsdom lacks the browser APIs the app is built on. These stand-ins are installed before every spec
 * file; `src/testing/fakes.ts` gives the specs handles to drive them.
 */
import { FakeAudioContext, FakeWorker, installAnimationFrames } from './testing/fakes';

// Modal <dialog>: jsdom knows the element but not showModal() / close().
const dialog = HTMLDialogElement.prototype;
if (typeof dialog.showModal !== 'function') {
  dialog.showModal = function (this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
  dialog.show = dialog.showModal;
  dialog.close = function (this: HTMLDialogElement, returnValue?: string): void {
    if (!this.hasAttribute('open')) return;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

Object.assign(globalThis, { AudioContext: FakeAudioContext, Worker: FakeWorker });
installAnimationFrames();

// Pointer capture (the tempo dial) is not in jsdom.
Element.prototype.setPointerCapture ??= function (): void {};
Element.prototype.releasePointerCapture ??= function (): void {};
