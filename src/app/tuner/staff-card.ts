import { Component, computed, inject } from '@angular/core';
import { spell } from '../music/note';
import { clefFor, clefTitle, placeOnStaff } from '../music/staff';
import { SettingsStore } from '../state/settings.store';
import { TunerStore } from '../state/tuner.store';

const SPACE = 14;
const BOTTOM_LINE_Y = 102;
const NOTE_X = 180;

/** SMuFL code points in Bravura. */
const GLYPH = { gClef: '', fClef: '', wholeNote: '', sharp: '', flat: '' } as const;

const y = (position: number): number => BOTTOM_LINE_Y - (position * SPACE) / 2;

/**
 * Cream staff card: clef and the detected note as a whole note, with ledger lines, accidental and
 * ottava sign. Drawn in a 310 × 150 space and scaled to fit, like the native staff.
 */
@Component({
  selector: 'app-staff-card',
  host: { class: 'flex flex-col items-center rounded-[20px] bg-paper px-2 pt-2 pb-3' },
  template: `
    <svg
      viewBox="0 0 310 150"
      class="w-full max-w-[434px]"
      role="img"
      [attr.aria-label]="description()"
    >
      <g class="stroke-ink" stroke-width="1.4">
        @for (line of staffLines; track line) {
          <line x1="12" x2="298" [attr.y1]="line" [attr.y2]="line" />
        }
        @for (ledger of ledgerYs(); track ledger) {
          <line
            [attr.x1]="noteX - 20"
            [attr.x2]="noteX + 20"
            [attr.y1]="ledger"
            [attr.y2]="ledger"
          />
        }
      </g>
      <g class="fill-ink font-bravura" [attr.font-size]="space * 4">
        <text x="22" [attr.y]="clefY()">{{ clefGlyph() }}</text>
        @if (note(); as note) {
          <text [attr.x]="noteX - 12" [attr.y]="note.y">{{ glyph.wholeNote }}</text>
          @if (note.accidental) {
            <text [attr.x]="noteX - (note.accidental === glyph.sharp ? 36 : 34)" [attr.y]="note.y">
              {{ note.accidental }}
            </text>
          }
        }
      </g>
      @if (note()?.ottava; as ottava) {
        <text
          class="fill-ink"
          font-size="15"
          font-style="italic"
          font-weight="600"
          dominant-baseline="middle"
          [attr.x]="noteX + 24"
          [attr.y]="ottava.y"
        >
          {{ ottava.label }}
        </text>
      }
    </svg>
    <span class="text-xs uppercase tracking-[0.06em] text-paper-label">{{ caption() }}</span>
  `,
})
export class StaffCard {
  private readonly tuner = inject(TunerStore);
  private readonly settings = inject(SettingsStore);

  protected readonly space = SPACE;
  protected readonly noteX = NOTE_X;
  protected readonly glyph = GLYPH;
  protected readonly staffLines = [0, 2, 4, 6, 8].map(y);

  private readonly clefSetting = computed(() => this.settings.settings().clef);
  private readonly clef = computed(() => clefFor(this.clefSetting(), this.tuner.reading()?.midi));
  protected readonly clefGlyph = computed(() =>
    this.clef() === 'treble' ? GLYPH.gClef : GLYPH.fClef,
  );
  protected readonly clefY = computed(() => (this.clef() === 'treble' ? y(2) : y(6)));
  protected readonly caption = computed(
    () => `${clefTitle(this.clef())} · ${this.clefSetting() === 'auto' ? 'auto' : 'fixed'}`,
  );

  private readonly spelling = computed(() => {
    const reading = this.tuner.reading();
    return reading ? spell(reading.midi, this.settings.settings().accidentals) : null;
  });

  private readonly placement = computed(() => {
    const spelling = this.spelling();
    return spelling ? placeOnStaff(spelling, this.clef()) : null;
  });

  protected readonly ledgerYs = computed(() => this.placement()?.ledgerLines.map(y) ?? []);

  protected readonly note = computed(() => {
    const spelling = this.spelling();
    const placement = this.placement();
    if (!spelling || !placement) return null;
    const noteY = y(placement.position);
    const accidental =
      spelling.accidental === 'sharp'
        ? GLYPH.sharp
        : spelling.accidental === 'flat'
          ? GLYPH.flat
          : null;
    // Beside the note, raised for 8va/15ma and lowered for 8vb/15mb, kept inside the card.
    const ottava = placement.ottavaLabel
      ? {
          label: placement.ottavaLabel,
          y: Math.min(Math.max(placement.ottava > 0 ? noteY - 12 : noteY + 12, 10), 140),
        }
      : null;
    return { y: noteY, accidental, ottava };
  });

  protected readonly description = computed(() => {
    const spelling = this.spelling();
    const clef = clefTitle(this.clef()).toLowerCase();
    return spelling
      ? `${spelling.name}${spelling.octave} on the ${clef} staff`
      : `${clefTitle(this.clef())}, no note`;
  });
}
