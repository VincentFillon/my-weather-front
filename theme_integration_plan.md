# Plan Détaillé pour le Système de Thème Global (Clair/Sombre)

**Objectif :** Intégrer les thèmes clair et sombre d'Angular Material en utilisant le service `ThemeService` existant.

**Étapes :**

1.  **Définir les thèmes Angular Material (Clair et Sombre)**
    *   Créer un fichier `src/theme/light-theme.scss` pour le thème clair.
    *   Créer un fichier `src/theme/dark-theme.scss` pour le thème sombre.
    *   Ces fichiers contiendront les définitions de thème Material (palette primaire, accent, warn, typographie, etc.).

2.  **Mettre à jour `angular.json` pour inclure les thèmes**
    *   Modifier la section `architect.build.options.styles` dans `angular.json` pour inclure les deux fichiers de thème. Cela permettra à Angular de compiler ces thèmes.

3.  **Modifier `src/styles.scss` pour charger dynamiquement les thèmes**
    *   Dans `src/styles.scss`, importer les thèmes créés.
    *   Utiliser les classes `light-mode` et `dark-mode` sur le `body` pour appliquer conditionnellement les thèmes Material.

4.  **Vérifier et ajuster le service `ThemeService` (si nécessaire)**
    *   Le service actuel gère déjà l'ajout/suppression de la classe `dark-mode`. Il est important de s'assurer que la classe `light-mode` est également gérée si elle est utilisée pour le thème clair. D'après le code, la classe `light-mode` est optionnelle et n'est pas explicitement ajoutée/retirée. Je vais m'assurer que la méthode `applyTheme()` gère correctement les deux cas.

5.  **Intégrer le service dans `AppComponent`**
    *   S'assurer que le service `ThemeService` est injecté et que la méthode `initTheme()` est appelée au démarrage de l'application (ce qui est déjà fait dans le constructeur du service).

6.  **Tester l'implémentation**
    *   Vérifier que le bouton de bascule de thème fonctionne correctement.
    *   Vérifier que les composants Angular Material changent d'apparence en fonction du thème sélectionné.

### Diagramme de Flux

```mermaid
graph TD
    A[Démarrage Application] --> B{Service ThemeService}
    B --> C{Lecture Préférence Utilisateur}
    C -- Thème stocké --> D[Appliquer Thème]
    C -- Pas de thème stocké --> E[Détecter Thème Système]
    E --> D
    D --> F[Ajouter/Supprimer classe 'dark-mode' sur body]
    F --> G[styles.scss]
    G -- .dark-mode présent --> H[Appliquer dark-theme.scss]
    G -- .dark-mode absent --> I[Appliquer light-theme.scss]
    J[Bouton Bascule Thème] --> K{Appel toggleTheme()}
    K --> B
