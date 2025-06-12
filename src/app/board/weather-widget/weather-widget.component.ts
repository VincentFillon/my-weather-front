import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { WeatherService } from '../../core/services/weather.service';

interface WeatherData {
  current: {
    temperature_2m: number;
    weathercode: number;
    is_day: number; // 0 = nuit, 1 = jour
  };
  current_units: {
    temperature_2m: string;
  };
  latitude: number;
  longitude: number;
  timezone: string;
}

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weather-widget.component.html',
  styleUrls: ['./weather-widget.component.scss'],
})
export class WeatherWidgetComponent implements OnInit, OnDestroy {
  private weatherService = inject(WeatherService);
  weatherData: WeatherData | null = null;
  loading = true;
  error: string | null = null;

  private weatherSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.getWeather();
  }

  getWeather(): void {
    this.loading = true;
    this.error = null;
    this.weatherSubscription = this.weatherService.getCurrentWeather().subscribe({
      next: (data) => {
        this.weatherData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de la météo:', err);
        this.error = 'Impossible de récupérer les données météo.';
        this.loading = false;
      },
    });
  }

  getWeatherIconUrl(weatherCode: number, isDay: number): string {
    return this.weatherService.getWeatherIconUrl(weatherCode, isDay);
  }

  getWeatherDescription(weatherCode: number): string {
    return this.weatherService.getWeatherDescription(weatherCode);
  }

  ngOnDestroy(): void {
    this.weatherSubscription?.unsubscribe();
  }
}
