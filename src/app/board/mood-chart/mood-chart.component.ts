import { CommonModule, formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { Mood } from '../../core/models/mood';
import { MoodChartData } from '../../core/models/mood-chart-data';
import { MoodChartService } from '../../core/services/mood-chart.service';
import { MoodService } from '../../core/services/mood.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-mood-chart',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, FormsModule],
  templateUrl: './mood-chart.component.html',
  styleUrl: './mood-chart.component.scss',
})
export class MoodChartComponent implements OnInit, OnDestroy {
  private moodChartService = inject(MoodChartService);
  public themeService = inject(ThemeService);
  private moodService = inject(MoodService);

  private moodChart: Chart | undefined;
  private moodChartData: MoodChartData[] | undefined;
  private moodChartSubscription: Subscription | undefined;
  private moodChartTimeout: NodeJS.Timeout | undefined;
  private subscriptions: Subscription[] = [];

  isDarkMode: boolean;
  moods: Mood[] = [];

  daysOptions = [
    { value: 7, label: '7 derniers jours' },
    { value: 15, label: '2 dernières semaines' },
    { value: 30, label: '30 derniers jours' },
    { value: 91, label: '3 derniers mois' },
    { value: 182, label: '6 derniers mois' },
    { value: 365, label: '12 derniers mois' },
  ];
  selectedDays: number;

  constructor() {
    this.isDarkMode = this.themeService.isDarkMode;
    this.selectedDays = 30; // Valeur par défaut
  }

  ngOnInit() {
    Chart.register(...registerables);
    this.getMoodChartData();

    const themeSubscription = this.themeService.darkModeSubject
      .asObservable()
      .subscribe((isDarkMode) => {
        if (isDarkMode !== this.isDarkMode) {
          this.isDarkMode = isDarkMode;
          this.renderMoodChart();
        }
      });
    this.subscriptions.push(themeSubscription);

    const moodsSubscription = this.moodService
      .findAllMoods()
      .subscribe((moods) => {
        this.moods = moods.sort((a, b) => a.order - b.order);
        this.renderMoodChart();
      });
    this.subscriptions.push(moodsSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.moodChartSubscription?.unsubscribe();
    if (this.moodChart) {
      this.moodChart.destroy();
    }
  }

  onDaysChange() {
    this.getMoodChartData();
  }

  private getMoodChartData(): void {
    if (this.moodChartTimeout) {
      clearTimeout(this.moodChartTimeout);
    }
    this.moodChartTimeout = setTimeout(() => {
      this.moodChartSubscription?.unsubscribe();
      this.moodChartSubscription = this.moodChartService
        .getMoodChartData(this.selectedDays)
        .subscribe((data) => {
          this.moodChartData = data;
          this.renderMoodChart();
        });
    });
  }

  private renderMoodChart() {
    if (this.moodChart) {
      this.moodChart.destroy();
    }

    const canvas = document.getElementById(
      'moodChartCanvas'
    ) as HTMLCanvasElement;
    if (canvas && this.moodChartData && this.moods.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        this.moodChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: this.moodChartData.map((data) =>
              this.formatDateForChart(new Date(data.date))
            ),
            datasets: [
              {
                label: 'Mon humeur',
                data: this.moodChartData.map((data) => data.userMoodOrder),
                borderColor: this.isDarkMode ? '#80d5d3' : '#356666',
                backgroundColor: this.isDarkMode
                  ? 'rgba(128, 213, 211, 0.2)'
                  : 'rgba(53, 102, 102, 0.2)',
                fill: 'start',
                spanGaps: true,
              },
              {
                label: 'Humeur médiane',
                data: this.moodChartData.map((data) => data.medianMoodOrder),
                borderColor: this.isDarkMode ? '#c0c6dc' : '#585e71',
                backgroundColor: this.isDarkMode
                  ? 'rgba(64, 70, 89, 0.2)'
                  : 'rgba(192, 198, 220, 0.2)',
                fill: 'start',
                spanGaps: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                reverse: true,
                min: Math.min(...this.moods.map((m) => m.order)),
                max: Math.max(...this.moods.map((m) => m.order)),
                grid: {
                  color: this.isDarkMode ? '#45464d' : '#c5c6d0',
                },
                ticks: {
                  color: this.isDarkMode ? '#909098' : '#757780',
                  callback: (value: number | string) => {
                    const mood = this.moods.find((m) => m.order === value);
                    return mood ? mood.name : '';
                  },
                  stepSize: 1,
                },
              },
              x: {
                grid: {
                  color: this.isDarkMode ? '#45464d' : '#c5c6d0',
                },
                ticks: {
                  color: this.isDarkMode ? '#909098' : '#757780',
                },
              },
            },
            plugins: {
              legend: {
                labels: {
                  color: this.isDarkMode ? '#909098' : '#757780',
                },
              },
              tooltip: {
                callbacks: {
                  // title: (context) => {
                  //   const date = new Date(context[0].label);
                  //   return this.formatDateForChart(date);
                  // },
                  label: (context) => {
                    const value = context.raw as number;
                    const mood = this.moods.find((m) => m.order === value);
                    return mood ? mood.name : `Ordre: ${value}`;
                  },
                },
              },
            },
          },
        });
      }
    }
  }

  private formatDateForChart(date: Date): string {
    if (!(date instanceof Date)) {
      return '';
    }

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startOfYesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1
    );
    const startOfDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    if (startOfDate.getTime() === startOfToday.getTime()) {
      return "aujourd'hui";
    }

    if (startOfDate.getTime() === startOfYesterday.getTime()) {
      return 'hier';
    }

    if (startOfDate >= startOfWeek && startOfDate <= startOfToday) {
      return formatDate(date, 'EEEE', 'fr-FR');
    }

    if (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return formatDate(date, 'EEE d', 'fr-FR');
    }

    if (date.getFullYear() === today.getFullYear()) {
      return formatDate(date, 'EEE d MMM', 'fr-FR');
    }

    return formatDate(date, 'dd/MM/yyyy', 'fr-FR');
  }
}
