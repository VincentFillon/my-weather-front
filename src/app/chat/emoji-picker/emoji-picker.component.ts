import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

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
  imports: [FormsModule, PickerComponent],
})
export class EmojiPickerComponent {
  @Input() search: string = '';
  @Output() emojiSelected = new EventEmitter<string>();

  @Output() close = new EventEmitter<void>();

  emoji18n = {
    search: 'Rechercher',
    emojilist: 'Liste des emoji',
    notfound: 'Aucun emoji trouvé',
    clear: 'Vider',
    categories: {
      search: 'Résultats de recherche',
      recent: 'Utilisés récemment',
      people: 'Smileys & Personnes',
      nature: 'Animaux & Nature',
      foods: 'Nourriture & Boisson',
      activity: 'Activité',
      places: 'Voyage & Lieux',
      objects: 'Objets',
      symbols: 'Symboles',
      flags: 'Drapeaux',
      custom: 'Personnalisé',
    },
    skintones: {
      1: 'Teinte de peau par défaut',
      2: 'Teinte de peau claire',
      3: 'Teinte de peau moyenne-claire',
      4: 'Teinte de peau moyenne',
      5: 'Teinte de peau moyenne-foncée',
      6: 'Teinte de peau foncée',
    },
  };

  filteredEmojis(): { emoji: string; name: string; tags?: string[] }[] {
    const query = this.search.toLowerCase().trim();
    return EMOJI_LIST.filter(
      (e) =>
        e.emoji.includes(query) ||
        e.name.toLowerCase().includes(query) ||
        (e.tags && e.tags.some((t) => t.includes(query)))
    );
  }

  selectEmoji(emoji: any) {
    // console.debug(emoji);
    this.emojiSelected.emit(emoji.emoji.native);
  }
}
