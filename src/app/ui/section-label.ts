import { Component } from '@angular/core';

@Component({
  selector: 'app-section-label',
  template: '<ng-content />',
  host: { class: 'block text-[13px] uppercase tracking-[0.08em] text-muted' },
})
export class SectionLabel {}
