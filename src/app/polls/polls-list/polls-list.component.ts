import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  filter,
  finalize,
  forkJoin,
  map,
  of,
  Subject,
  Subscription,
  switchMap,
  take,
} from 'rxjs';
import {
  Poll,
  PollOption,
  SearchPollDto,
  UserVote,
} from '../../core/models/poll';
import { PollService } from '../../core/services/poll.service';

interface PollWithResults extends Poll {
  topOptions: (PollOption & { percentage: number; count: number })[];
  totalVotes: number;
}

@Component({
  selector: 'app-polls-list',
  imports: [
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
  ],
  providers: [
    {provide: MAT_DATE_LOCALE, useValue: 'fr-FR'},
    provideNativeDateAdapter()
  ],
  templateUrl: './polls-list.component.html',
  styleUrl: './polls-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollsListComponent implements OnInit, OnDestroy {
  private readonly DEFAULT_LIMIT = 10;

  private pollService = inject(PollService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  // Utilise un BehaviorSubject pour gérer les données et les mises à jour
  private pollsSubject = new BehaviorSubject<PollWithResults[]>([]);
  polls$ = this.pollsSubject.asObservable();

  filters: SearchPollDto = {
    ended: false,
    sort: 'createdAt',
    order: 'desc',
    limit: this.DEFAULT_LIMIT,
  };

  isLoading = true;
  error: string | null = null;

  private pollSearchSubscription = new Subscription();
  private subscriptions = new Subscription();
  private filterSubject = new Subject<void>();

  // Mobile filters state
  public isFiltersVisible = false;

  toggleFilters(): void {
    this.isFiltersVisible = !this.isFiltersVisible;
  }

  ngOnInit(): void {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.loadPollsAndResults();
    });
    this.loadPollsAndResults();
    this.listenToPollUpdates();
  }

  ngOnDestroy(): void {
    this.filterSubject.complete();
    this.pollSearchSubscription.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  applyFilters(): void {
    this.filterSubject.next();
  }

  loadPollsAndResults(): void {
    this.isLoading = true;
    this.error = null;
    this.pollsSubject.next([]); // Réinitialiser les données avant de charger
    this.cd.markForCheck(); // Marquer pour vérification avec OnPush

    if (this.pollSearchSubscription) {
      this.pollSearchSubscription.unsubscribe();
    }

    this.pollSearchSubscription = this.pollService
      .searchPolls(this.filters)
      .pipe(
        switchMap((polls) => {
          if (!polls || polls.length === 0) {
            return of([]); // Complète immédiatement avec un tableau vide
          }

          // Crée un tableau d'observables pour les votes
          const voteRequests = polls.map((poll) =>
            this.pollService.findPollVotes(poll._id).pipe(
              filter((pollVotes) => pollVotes.pollId === poll._id), // Filtre pour s'assurer que l'ID correspond
              take(1), // Prend la première émission ET complète l'observable
              map((pollVotes) => ({ poll, votes: pollVotes.userVotes })), // Combine le sondage avec ses votes
              catchError((err) => {
                // Gestion d'erreur pour UN SEUL appel de votes
                // Permet à forkJoin de continuer même si un appel échoue
                console.error(`Error loading votes for poll ${poll._id}:`, err);
                return of({ poll, votes: [] }); // Retourne des votes vides pour ce sondage en cas d'erreur
              })
            )
          );

          console.log(
            `Created ${voteRequests.length} vote requests for forkJoin`
          );
          return forkJoin(voteRequests); // forkJoin attendra que chaque observable (avec take(1)) complète
        }),
        map((results) => {
          // Calcule les pourcentages et les top options pour chaque sondage
          return results.map(({ poll, votes }) =>
            this.calculatePollResults(poll, votes)
          );
        })
      )
      .subscribe({
        next: (pollsWithResults) => {
          this.pollsSubject.next(pollsWithResults);
          this.isLoading = false; // <- Ici
          this.error = null;
          this.cd.markForCheck();
        },
        error: (err) => {
          console.error('Final subscribe: Error occurred:', err);
          // Gère l'erreur globale (si findAllPolls échoue, ou si forkJoin échoue sans catchError interne)
          this.error = 'Failed to load polls or their results.';
          this.isLoading = false; // <- Ici aussi
          this.pollsSubject.next([]); // Vide la liste en cas d'erreur
          this.cd.markForCheck();
        },
      });
  }

  private calculatePollResults(poll: Poll, votes: UserVote[]): PollWithResults {
    const totalVotes = votes.length;
    const voteCounts: { [optionId: string]: number } = {};

    // Initialise les compteurs
    poll.options.forEach((opt) => (voteCounts[opt._id] = 0));

    // Compte les votes pour chaque option
    votes.forEach((vote) => {
      vote.selectedOptions.forEach((optionId) => {
        if (voteCounts[optionId] !== undefined) {
          voteCounts[optionId]++;
        }
      });
    });

    // Calcule les pourcentages et trie les options
    const optionsWithStats = poll.options
      .map((option) => ({
        ...option,
        count: voteCounts[option._id],
        percentage:
          totalVotes > 0 ? (voteCounts[option._id] / totalVotes) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count); // Trie par nombre de votes décroissant

    return {
      ...poll,
      totalVotes: totalVotes,
      topOptions: optionsWithStats.slice(0, 3), // Prend les 3 premières
    };
  }

  private listenToPollUpdates(): void {
    // Écoute les nouveaux votes pour mettre à jour les résultats
    this.subscriptions.add(
      this.pollService.onUserVoted().subscribe((userVote) => {
        console.log('User voted event received:', userVote);
        // Recharge les votes pour le sondage spécifique et met à jour
        this.updatePollResults(userVote.pollId); // Assumant que poll est populé dans UserVote ou que l'ID est dispo
      })
    );

    // Écoute les nouveaux sondages
    this.subscriptions.add(
      this.pollService.onPollCreated().subscribe((newPoll) => {
        console.log('Poll created event received:', newPoll);
        // Pour simplifier, recharge tout. Ou ajoute le nouveau sondage à la liste
        this.loadPollsAndResults();
      })
    );

    // Écoute les sondages supprimés
    this.subscriptions.add(
      this.pollService.onPollRemoved().subscribe((removedPollId) => {
        console.log('Poll removed event received:', removedPollId);
        const currentPolls = this.pollsSubject.getValue();
        this.pollsSubject.next(
          currentPolls.filter((p) => p._id !== removedPollId)
        );
        this.cd.markForCheck();
      })
    );

    // Écoute les mises à jour de sondages (ex: titre, description, date de fin)
    this.subscriptions.add(
      this.pollService.onPollUpdated().subscribe((updatedPoll) => {
        console.log('Poll updated event received:', updatedPoll);
        // Recharge les détails du sondage spécifique
        this.updatePollResults(updatedPoll._id);
      })
    );
  }

  // Fonction pour mettre à jour un seul sondage dans la liste
  private updatePollResults(pollId: string): void {
    const currentPolls = this.pollsSubject.getValue();
    const pollIndex = currentPolls.findIndex((p) => p._id === pollId);

    // Si le sondage n'est pas dans la liste actuelle, on ne fait rien (ou on recharge tout)
    if (pollIndex === -1) {
      // Optionnel: si un vote arrive pour un sondage non listé, recharger?
      // this.loadPollsAndResults();
      console.warn(
        `Received vote for poll ${pollId} not currently in the list.`
      );
      return;
    }

    const pollToUpdate = currentPolls[pollIndex];

    // Recharge les votes spécifiquement pour ce sondage
    const updateSub = this.pollService
      .findPollVotes(pollId)
      .pipe(finalize(() => updateSub.unsubscribe()))
      .subscribe({
        next: (votes) => {
          const updatedPollWithResults = this.calculatePollResults(
            pollToUpdate,
            votes.userVotes
          );
          const newPollsList = [...currentPolls];
          newPollsList[pollIndex] = updatedPollWithResults;
          this.pollsSubject.next(newPollsList);
          this.cd.markForCheck();
        },
        error: (err) => {
          console.error(
            `Error fetching votes for poll ${pollId} after update:`,
            err
          );
        },
      });
  }

  navigateToDetail(pollId: string): void {
    this.router.navigate(['/polls', pollId]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/polls/new']);
  }

  goBack(): void {
    this.router.navigate(['/board']);
  }
}
