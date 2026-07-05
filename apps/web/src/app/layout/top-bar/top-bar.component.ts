import { Component, ChangeDetectionStrategy, Input, HostBinding } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-top-bar',
  standalone: true,
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  @Input() isHidden = false;

  @HostBinding('class.hidden') get hidden() {
    return this.isHidden;
  }
}
