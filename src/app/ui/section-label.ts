import { Component } from '@angular/core';

@Component({
  selector: 'app-section-label',
  host: { class: 'block text-[13px] uppercase tracking-[0.08em] text-muted' },
  template: '<ng-content />',
})
export class SectionLabel {}
