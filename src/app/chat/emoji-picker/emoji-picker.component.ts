import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { NgScrollReached } from 'ngx-scrollbar/reached-event';
import { Subject, debounceTime } from 'rxjs';
import { TenorGif } from '../../core/models/tenor-gif';
import { TenorService } from '../../core/services/tenor.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.component.html',
  styleUrls: ['./emoji-picker.component.scss'],
  standalone: true, // Ajouté pour rendre le composant autonome
  imports: [
    CommonModule,
    FormsModule,
    PickerComponent,
    MatTabsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    NgScrollbarModule,
    NgScrollReached,
  ],
})
export class EmojiPickerComponent implements OnInit, OnDestroy {
  @Input() allowGifSelection: boolean = true;
  @Output() emojiSelected = new EventEmitter<string>();
  @Output() gifSelected = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  private tenorService = inject(TenorService);
  themeService = inject(ThemeService);

  selectedTab = signal<number>(0); // 0 for Emojis, 1 for GIFs

  gifSearchQuery: string = '';
  trendingGifs = signal<TenorGif[]>([]);
  searchResults = signal<TenorGif[]>([]);
  isLoadingGifs = signal(false);
  nextGifs = signal('');
  gifError = signal<string | null>(null);

  private searchSubject = new Subject<string>();

  readonly scrollThreshold = 100;

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

  ngOnInit(): void {
    if (this.allowGifSelection) {
      this.loadTrendingGifs();
    }

    this.searchSubject
      .pipe(debounceTime(300)) // Délai de 300ms
      .subscribe(() => {
        this.performGifSearch();
      });
  }

  ngOnDestroy(): void {
    this.searchSubject.unsubscribe();
  }

  selectEmoji(emoji: any) {
    this.emojiSelected.emit(emoji.emoji.colons);
  }

  onGifSearch(next?: string): void {
    this.gifError.set(null);
    if (next) {
      // Si 'next' est fourni, c'est un chargement de plus, pas une nouvelle recherche
      this.performGifSearch(next);
    } else {
      // Sinon, c'est une nouvelle recherche, on utilise le subject pour le debounce
      this.searchSubject.next(this.gifSearchQuery);
    }
  }

  private performGifSearch(next?: string): void {
    if (this.gifSearchQuery.trim()) {
      this.isLoadingGifs.set(true);
      this.tenorService.searchGifs(this.gifSearchQuery, 10, next).subscribe({
        next: (response) => {
          if (next) {
            this.searchResults.set([...this.searchResults(), ...response.results]);
          } else {
            this.searchResults.set(response.results);
          }
          this.isLoadingGifs.set(false);
          this.nextGifs.set(response.next);
        },
        error: (err) => {
          console.error('Error searching GIFs:', err);
          this.gifError.set('Erreur lors de la recherche de GIFs.');
          this.isLoadingGifs.set(false);
        },
      });
    } else {
      if (!next) {
        this.searchResults.set([]);
      }
      this.loadTrendingGifs(next);
    }
  }

  loadTrendingGifs(next?: string): void {
    this.gifError.set(null);
    this.isLoadingGifs.set(true);
    this.tenorService.getTrendingGifs(10, next).subscribe({
      next: (response) => {
        if (next) {
          this.trendingGifs.set([...this.trendingGifs(), ...response.results]);
        } else {
          this.trendingGifs.set(response.results);
        }
        this.isLoadingGifs.set(false);
        this.nextGifs.set(response.next);
      },
      error: (err) => {
        console.error('Error loading trending GIFs:', err);
        this.gifError.set('Erreur lors du chargement des GIFs tendances.');
        this.isLoadingGifs.set(false);
      },
    });
  }

  onScroll(): void {
    if (this.isLoadingGifs() || !this.nextGifs()) {
      return;
    }

    this.onGifSearch(this.nextGifs());
  }

  selectGif(gif: TenorGif): void {
    this.gifSelected.emit(gif.media_formats.gif.url);
  }

  onTabChange(event: any): void {
    this.selectedTab.set(event.index);
    if (event.index === 1 && this.gifSearchQuery === '') {
      this.loadTrendingGifs();
    }
  }
}
