import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Exemple simplifié, tu peux remplacer par un import JSON de emojis enrichis (cf. emoji-mart, ...) :
const EMOJI_LIST: { emoji: string; name: string; tags?: string[] }[] = [
  { emoji: '😀', name: 'grinning face', tags: ['smile', 'happy'] },
  { emoji: '😂', name: 'face with tears of joy', tags: ['lol', 'laugh'] },
  {
    emoji: '😍',
    name: 'smiling face with heart-eyes',
    tags: ['love', 'crush'],
  },
  { emoji: '👍', name: 'thumbs up', tags: ['like', 'approve'] },
  { emoji: '😭', name: 'crying face', tags: ['sad', 'tears'] },
  { emoji: '🔥', name: 'fire', tags: ['hot', 'lit'] },
  // Ajoute-en ou importe-en des centaines d'autres...
];

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.component.html',
  styleUrls: ['./emoji-picker.component.scss'],
  imports: [FormsModule],
})
export class EmojiPickerComponent {
  @Input() search: string = '';
  @Output() emojiSelected = new EventEmitter<string>();

  @Output() close = new EventEmitter<void>();

  filteredEmojis(): { emoji: string; name: string; tags?: string[] }[] {
    const query = this.search.toLowerCase().trim();
    return EMOJI_LIST.filter(
      (e) =>
        e.emoji.includes(query) ||
        e.name.toLowerCase().includes(query) ||
        (e.tags && e.tags.some((t) => t.includes(query)))
    );
  }

  selectEmoji(emoji: string) {
    this.emojiSelected.emit(emoji);
  }
}
