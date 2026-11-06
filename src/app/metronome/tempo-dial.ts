import { Component, computed, inject, input } from '@angular/core';
import { BPM_RANGE, durationSymbol, durationTitle } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';

const SPAN = BPM_RANGE.max - BPM_RANGE.min;

/** 270° tempo arc with a knob. Drag around the dial to change the tempo; arrow keys nudge it. */
@Component({
  selector: 'app-tempo-dial',
  template: `
    <svg class="absolute inset-0" aria-hidden="true" [attr.viewBox]="viewBox()">
      <circle
        fill="none"
        class="stroke-stroke"
        stroke-width="10"
        stroke-linecap="round"
        [attr.cx]="center()"
        [attr.cy]="center()"
        [attr.r]="radius()"
        [attr.stroke-dasharray]="track()"
        [attr.transform]="rotation()"
      />
      <circle
        fill="none"
        class="stroke-accent"
        stroke-width="10"
        stroke-linecap="round"
        [attr.cx]="center()"
        [attr.cy]="center()"
        [attr.r]="radius()"
        [attr.stroke-dasharray]="fill()"
        [attr.transform]="rotation()"
      />
      <circle r="12" class="fill-fg" [attr.cx]="knob().x" [attr.cy]="knob().y" />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
      <span
        class="leading-none font-semibold tracking-[-0.03em] tabular"
        [style.font-size.px]="diameter() * 0.387"
      >
        {{ store.bpm() }}
      </span>
      <span class="mt-1 text-sm tracking-[0.12em] text-muted"
        ><span class="font-music tracking-normal">{{ tempoNote() }}</span> BPM</span
      >
    </div>
  `,
  host: {
    role: 'slider',
    tabindex: '0',
    'aria-label': 'Tempo',
    class: 'relative block shrink-0 touch-none select-none',
    '[style.width.px]': 'diameter()',
    '[style.height.px]': 'diameter()',
    '[attr.aria-valuemin]': 'min',
    '[attr.aria-valuemax]': 'max',
    '[attr.aria-valuenow]': 'store.bpm()',
    '[attr.aria-valuetext]':
      'store.bpm() + " BPM, " + tempoNoteTitle() + " notes, " + store.tempoMarking()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'dragAngle = null',
    '(pointercancel)': 'dragAngle = null',
    '(keydown)': 'onKeydown($event)',
  },
})
export class TempoDial {
  protected readonly store = inject(MetronomeStore);
  readonly diameter = input(248);

  protected readonly min = BPM_RANGE.min;
  protected readonly max = BPM_RANGE.max;
  /** The note the BPM counts: ♩ in 4/4, ♪ in 7/8, ♩. in 6/8 counted in two. */
  protected readonly tempoNote = computed(() =>
    durationSymbol(this.store.tempoUnits(), this.store.timeSignature().unit),
  );
  protected readonly tempoNoteTitle = computed(() =>
    durationTitle(this.store.tempoUnits(), this.store.timeSignature().unit),
  );
  protected readonly center = computed(() => this.diameter() / 2);
  protected readonly radius = computed(() => this.diameter() / 2 - 12);
  protected readonly viewBox = computed(() => `0 0 ${this.diameter()} ${this.diameter()}`);
  protected readonly rotation = computed(() => `rotate(135 ${this.center()} ${this.center()})`);

  private readonly fraction = computed(() => (this.store.bpm() - BPM_RANGE.min) / SPAN);
  private readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly track = computed(
    () => `${0.75 * this.circumference()} ${this.circumference()}`,
  );
  protected readonly fill = computed(
    () => `${0.75 * this.circumference() * this.fraction()} ${this.circumference()}`,
  );
  protected readonly knob = computed(() => {
    const angle = ((135 + 270 * this.fraction()) * Math.PI) / 180;
    return {
      x: this.center() + this.radius() * Math.cos(angle),
      y: this.center() + this.radius() * Math.sin(angle),
    };
  });

  protected dragAngle: number | null = null;
  private dragValue = 0;

  protected onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragAngle = this.angle(event);
    this.dragValue = this.store.bpm();
  }

  /** Relative drag: the change in angle around the centre moves the tempo; a full arc spans the whole range. */
  protected onPointerMove(event: PointerEvent): void {
    if (this.dragAngle === null) return;
    const angle = this.angle(event);
    let delta = angle - this.dragAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    this.dragAngle = angle;
    this.dragValue = Math.min(
      Math.max(this.dragValue + (delta / 270) * SPAN, BPM_RANGE.min),
      BPM_RANGE.max,
    );
    const rounded = Math.round(this.dragValue);
    if (rounded !== this.store.bpm()) this.store.setBpm(rounded);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const deltas: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      PageUp: 10,
      PageDown: -10,
    };
    const delta = deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    this.store.nudge(delta);
  }

  private angle(event: PointerEvent): number {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return (
      (Math.atan2(
        event.clientY - rect.top - rect.height / 2,
        event.clientX - rect.left - rect.width / 2,
      ) *
        180) /
      Math.PI
    );
  }
}
