
import { Inject, Injectable, Renderer2, RendererFactory2, DOCUMENT } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private readonly THEME_KEY = 'user-theme-preference';
  private readonly DARK_THEME_CLASS = 'dark-mode';
  private readonly LIGHT_THEME_CLASS = 'light-mode'; // Optionnel, si vous voulez une classe explicite pour le clair

  public isDarkMode: boolean = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initTheme();
  }

  private initTheme(): void {
    const storedPreference = localStorage.getItem(this.THEME_KEY);

    if (storedPreference) {
      this.isDarkMode = storedPreference === 'dark';
    } else {
      this.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme();
  }

  public toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(this.THEME_KEY, this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.isDarkMode) {
      this.renderer.addClass(this.document.body, this.DARK_THEME_CLASS);
    } else {
      this.renderer.removeClass(this.document.body, this.DARK_THEME_CLASS);
    }
  }

  public getCurrentTheme(): 'light' | 'dark' {
    return this.isDarkMode ? 'dark' : 'light';
  }
}
