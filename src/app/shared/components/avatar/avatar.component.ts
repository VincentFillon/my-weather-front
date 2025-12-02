import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../core/models/user';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent {
  @Input() user: Partial<User> | null = null;
  @Input() size: number = 40;
  @Input() showFrame: boolean = true;

  get avatarUrl(): string {
    return this.user?.image || 'assets/default-avatar.png';
  }

  get frameUrl(): string | undefined {
    return this.user?.selectedFrame?.image;
  }
}
