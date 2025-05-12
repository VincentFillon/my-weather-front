import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  Observable,
  of,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import {
  Poll,
  PollOption,
  UserVote,
  UserVoteDto,
} from '../../core/models/poll';
import { Role } from '../../core/models/role.enum';
import { User } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';
import { PollService } from '../../core/services/poll.service';

interface OptionWithResult extends PollOption {
  count: number;
  percentage: number;
  voters: User[];
  isSelected: boolean; // Indique si l'utilisateur actuel a sélectionné cette option
}

interface PollDetailView extends Poll {
  optionsWithResults: OptionWithResult[];
  totalVotes: number;
  userHasVoted: boolean;
  isExpired: boolean;
}

@Component({
  selector: 'app-poll-detail',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, AsyncPipe, DatePipe, DecimalPipe],
  templateUrl: './poll-detail.component.html',
  styleUrl: './poll-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollDetailComponent implements OnInit, OnDestroy {
  private pollService = inject(PollService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  private pollId: string | null = null;
  private subscriptions = new Subscription();

  // BehaviorSubjects pour les données de base
  private pollSubject = new BehaviorSubject<Poll | null>(null);
  private votesSubject = new BehaviorSubject<UserVote[]>([]);
  private userSelectionSubject = new BehaviorSubject<Set<string>>(new Set()); // IDs des options sélectionnées par l'utilisateur

  // Observable combiné pour la vue
  pollDetailView$: Observable<PollDetailView | null> = combineLatest([
    this.pollSubject,
    this.votesSubject,
    this.userSelectionSubject,
  ]).pipe(
    map(([poll, votes, userSelection]) => {
      if (!poll) return null;
      return this.calculatePollDetailView(poll, votes, userSelection);
    })
  );

  isLoading = true;
  error: string | null = null;
  isSubmittingVote = false; // Pour gérer l'état lors de l'envoi du vote

  deletable = false;

  ngOnInit(): void {
    const pollIdSub = this.route.params
      .pipe(
        tap((params) => {
          this.pollId = params['id'];
          this.isLoading = true;
          this.error = null;
          this.cd.markForCheck();
        }),
        // Utilise switchMap pour chaîner les appels de service
        switchMap((params) => {
          const id = params['id'];
          if (!id) {
            this.error = 'Poll ID not found.';
            this.isLoading = false;
            this.cd.markForCheck();
            return of({ poll: null, votes: [] }); // Retourne un objet vide pour éviter les erreurs
          }
          // Appels en parallèle pour le sondage et les votes
          return combineLatest({
            poll: this.pollService.findOnePoll(id),
            votes: this.pollService.findPollVotes(id),
          });
        })
      )
      .subscribe({
        next: ({ poll, votes }) => {
          if (poll) {
            this.pollSubject.next(poll);
            this.votesSubject.next(votes.userVotes);
            this.initializeUserSelection(votes.userVotes); // Initialise la sélection de l'utilisateur
            this.deletable =
              poll.creator._id === this.authService.currentUser()?._id ||
              this.authService.currentUser()?.role === Role.ADMIN;
            this.isLoading = false;
          } else {
            this.error = 'Sondage non trouvé.';
            this.isLoading = false;
          }
          this.cd.markForCheck(); // Marquer pour la détection de changement
        },
        error: (err) => {
          console.error('Error loading poll details:', err);
          this.error = 'Failed to load poll details.';
          this.isLoading = false;
          this.cd.markForCheck();
        },
      });

    this.subscriptions.add(pollIdSub);
    this.listenToUpdates();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private calculatePollDetailView(
    poll: Poll,
    votes: UserVote[],
    userSelection: Set<string>
  ): PollDetailView {
    const totalVotes = votes.length;
    const voteCounts: { [optionId: string]: { count: number; voters: User[]; } } = {};
    poll.options.forEach((opt) => (voteCounts[opt._id] = { count: 0, voters: [] }));

    votes.forEach((vote) => {
      vote.selectedOptions.forEach((optionId) => {
        if (voteCounts[optionId] !== undefined) {
          voteCounts[optionId].count++;
          voteCounts[optionId].voters.push(vote.user);
        }
      });
    });

    const optionsWithResults = poll.options.map((option) => ({
      ...option,
      count: voteCounts[option._id].count,
      voters: voteCounts[option._id].voters,
      percentage:
        totalVotes > 0 ? (voteCounts[option._id].count / totalVotes) * 100 : 0,
      isSelected: userSelection.has(option._id),
    }));

    const userVote = votes.find(
      (v) => v.user._id === this.authService.currentUser()?._id
    ); // Assumant que 'user' est populé ou que tu as l'ID

    return {
      ...poll,
      optionsWithResults,
      totalVotes,
      userHasVoted: !!userVote,
      isExpired: new Date(poll.endDate) < new Date(),
    };
  }

  // Initialise la sélection de l'utilisateur à partir des votes existants
  private initializeUserSelection(votes: UserVote[]): void {
    const currentUserVote = votes.find(
      (vote) => vote.user._id === this.authService.currentUser()?._id
    ); // Assumant user._id est disponible
    const initialSelection = new Set<string>();
    if (currentUserVote) {
      currentUserVote.selectedOptions.forEach((optId) =>
        initialSelection.add(optId)
      );
    }
    this.userSelectionSubject.next(initialSelection);
  }

  // Gère le clic sur une option
  handleOptionClick(optionId: string): void {
    const currentPoll = this.pollSubject.getValue();
    if (
      !currentPoll ||
      new Date(currentPoll.endDate) < new Date() ||
      this.isSubmittingVote
    ) {
      return; // Ne rien faire si le sondage est expiré ou en cours de soumission
    }

    const currentSelection = new Set(this.userSelectionSubject.getValue()); // Copie le Set

    if (currentPoll.multipleChoice) {
      // Choix multiple: ajoute ou retire l'option
      if (currentSelection.has(optionId)) {
        currentSelection.delete(optionId);
      } else {
        currentSelection.add(optionId);
      }
    } else {
      // Choix unique: retire l'ancienne sélection (si différente) et ajoute la nouvelle
      if (currentSelection.has(optionId)) {
        // Si on clique sur l'option déjà sélectionnée, on la désélectionne
        currentSelection.delete(optionId);
      } else {
        currentSelection.clear(); // Vide le set
        currentSelection.add(optionId); // Ajoute la nouvelle option
      }
    }

    // Met à jour immédiatement l'état local de la sélection
    this.userSelectionSubject.next(currentSelection);
    // Déclenche l'envoi du vote au backend
    this.submitVote();
  }

  // Envoie le vote au backend
  submitVote(): void {
    if (!this.pollId || this.isSubmittingVote) return;

    this.isSubmittingVote = true;
    this.cd.markForCheck(); // Pour montrer l'état de soumission

    const voteDto: UserVoteDto = {
      pollId: this.pollId,
      selectedOptions: Array.from(this.userSelectionSubject.getValue()), // Convertit le Set en tableau
    };

    // On n'attend pas de réponse directe ici car le WebSocket `onUserVoted`
    // devrait nous notifier de la mise à jour (qui mettra à jour les votes via `listenToUpdates`)
    this.pollService.userVote(voteDto);

    // Simule la fin de la soumission après un court délai (pour l'UX)
    // En pratique, on pourrait attendre un acquittement du serveur si nécessaire
    setTimeout(() => {
      this.isSubmittingVote = false;
      this.cd.markForCheck();
    }, 300); // Petit délai pour montrer que quelque chose se passe
  }

  // Écoute les mises à jour via WebSocket
  private listenToUpdates(): void {
    if (!this.pollId) return;

    // Mise à jour quand quelqu'un vote sur CE sondage
    this.subscriptions.add(
      this.pollService
        .onUserVoted()
        .pipe(
          // Filtre pour ne réagir qu'aux votes concernant le sondage actuel
          filter((userVote) => userVote.pollId === this.pollId) // Assumant que poll._id est disponible
        )
        .subscribe((userVote) => {
          console.log(
            `Vote received for current poll ${this.pollId}:`,
            userVote
          );
          // Recharge les votes pour ce sondage pour mettre à jour les pourcentages
          const votesSub = this.pollService
            .findPollVotes(this.pollId!)
            .subscribe((votes) => {
              this.votesSubject.next(votes.userVotes);
              // Si le vote concerne l'utilisateur actuel, met à jour sa sélection locale aussi
              if (
                userVote.userVote.user._id ===
                this.authService.currentUser()?._id
              ) {
                const newSelection = new Set<string>(
                  userVote.userVote.selectedOptions
                );
                this.userSelectionSubject.next(newSelection);
              }
              this.cd.markForCheck();
            });
          // Ne pas ajouter votesSub aux subscriptions globales car il est court
        })
    );

    // Mise à jour si les détails du sondage changent (titre, date fin...)
    this.subscriptions.add(
      this.pollService
        .onPollUpdated()
        .pipe(filter((updatedPoll) => updatedPoll._id === this.pollId))
        .subscribe((updatedPoll) => {
          console.log(`Current poll ${this.pollId} updated:`, updatedPoll);
          this.pollSubject.next(updatedPoll);
          this.cd.markForCheck();
        })
    );

    // Gérer le cas où le sondage est supprimé pendant qu'on le regarde
    this.subscriptions.add(
      this.pollService
        .onPollRemoved()
        .pipe(filter((removedPollId) => removedPollId === this.pollId))
        .subscribe(() => {
          console.log(`Current poll ${this.pollId} was removed.`);
          this.error = 'Ce sondage a été supprimé.';
          this.pollSubject.next(null); // Efface les données du sondage
          this.deletable = false;
          this.isLoading = false;
          this.cd.markForCheck();
          // Optionnel: rediriger l'utilisateur
          // this.router.navigate(['/polls']);
        })
    );
  }

  // Helper pour vérifier si une option est désactivée
  isOptionDisabled(
    pollView: PollDetailView | null,
    option: OptionWithResult
  ): boolean {
    return !!pollView?.isExpired || this.isSubmittingVote;
  }

  deletePoll() {
    if (this.pollId) {
      this.pollService.removePoll(this.pollId);
    }
  }

  // Helper pour retourner à la liste
  goBack(): void {
    this.router.navigate(['/polls']);
  }
}
