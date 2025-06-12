import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ThemeService } from './theme.service'; // Import du ThemeService

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

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private http = inject(HttpClient);
  private themeService = inject(ThemeService); // Injection du ThemeService
  private readonly API_URL = 'https://api.open-meteo.com/v1/forecast'; // Utilisation de Open-Meteo pour la simplicité et la gratuité
  // Meteoblue est plus complexe et souvent payant pour l'API directe. Open-Meteo est une bonne alternative gratuite.
  // private readonly API_KEY = environment.meteoblueApiKey; // Meteoblue nécessite une clé API, Open-Meteo non pour les données de base.

  getWeatherByCoords(lat: number, lon: number): Observable<WeatherData> {
    return this.http.get<WeatherData>(this.API_URL, {
      params: {
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: 'temperature_2m,weathercode,is_day', // Ajout de is_day
        timezone: 'auto',
      },
    });
  }

  // Pour Open-Meteo, il n'y a pas de recherche par ville directe, seulement par coordonnées.
  // Nous allons simuler cela en utilisant les coordonnées par défaut si la géolocalisation échoue.
  // La ville sera déterminée côté client ou affichée comme "Localisation inconnue".
  // Pour une recherche par ville, il faudrait une API de géocodage séparée.
  // Pour l'instant, nous allons simplement utiliser les coordonnées par défaut.
  getWeatherByCity(lat: number, lon: number): Observable<WeatherData> {
    return this.getWeatherByCoords(lat, lon);
  }

  getCurrentWeather(): Observable<WeatherData> {
    return from(
      new Promise<GeolocationPosition>((resolve, reject) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000, // 10 secondes
            maximumAge: 600000, // 10 minutes
            enableHighAccuracy: false,
          });
        } else {
          reject('Geolocation is not supported by this browser.');
        }
      })
    ).pipe(
      switchMap((position) =>
        this.getWeatherByCoords(
          position.coords.latitude,
          position.coords.longitude
        )
      ),
      catchError((error) => {
        console.warn('Erreur de géolocalisation, utilisation de la localisation par défaut:', error);
        const defaultLocation = environment.defaultWeatherLocation;
        return this.getWeatherByCity(defaultLocation.lat, defaultLocation.lon);
      })
    );
  }

  // Mapping des codes météo Open-Meteo vers des icônes ou descriptions
  // Source: https://www.open-meteo.com/en/docs/current-weather-api
  getWeatherIconUrl(weatherCode: number, isDay: number): string {
    const isDarkMode = this.themeService.isDarkMode;
    let iconName: string;

    switch (weatherCode) {
      case 0: // Clear sky
        iconName = isDay === 1 ? 'sunny' : 'clear';
        break;
      case 1: // Mainly clear
        iconName = isDay === 1 ? 'mostly_sunny' : 'mostly_clear';
        break;
      case 2: // Partly cloudy
        iconName = isDay === 1 ? 'partly_cloudy' : 'partly_clear';
        break;
      case 3: // Overcast
        iconName = 'cloudy';
        break;
      case 45: // Fog
      case 48: // Depositing rime fog
        iconName = 'fog';
        break;
      case 51: // Drizzle: Light
      case 53: // Drizzle: Moderate
      case 55: // Drizzle: Dense intensity
        iconName = 'drizzle';
        break;
      case 56: // Freezing Drizzle: Light
      case 57: // Freezing Drizzle: Dense intensity
        iconName = 'wintry_mix';
        break;
      case 61: // Rain: Slight
      case 63: // Rain: Moderate
      case 65: // Rain: Heavy intensity
        iconName = 'showers';
        break;
      case 66: // Freezing Rain: Light
      case 67: // Freezing Rain: Heavy intensity
        iconName = 'scattered_snow';
        break;
      case 71: // Snow fall: Slight
      case 73: // Snow fall: Moderate
      case 75: // Snow fall: Heavy intensity
        iconName = 'snow_showers';
        break;
      case 77: // Snow grains
        iconName = 'sleet_hail';
        break;
      case 80: // Rain showers: Slight
      case 81: // Rain showers: Moderate
      case 82: // Rain showers: Violent
        iconName = 'showers';
        break;
      case 85: // Snow showers slight
      case 86: // Snow showers heavy
        iconName = 'heavy_snow';
        break;
      case 95: // Thunderstorm: Slight or moderate
      case 96: // Thunderstorm with slight hail
      case 99: // Thunderstorm with heavy hail
        iconName = 'thunderstorm';
        break;
      default:
        iconName = 'sunny'; // Default to sunny if unknown
        break;
    }

    const themeSuffix = isDarkMode ? '_dark' : '';
    return `https://maps.gstatic.com/weather/v1/${iconName}${themeSuffix}.svg`;
  }

  getWeatherDescription(weatherCode: number): string {
    if (weatherCode === 0) return 'Ciel dégagé';
    if (weatherCode >= 1 && weatherCode <= 3) return 'Partiellement nuageux';
    if (weatherCode >= 45 && weatherCode <= 48) return 'Brouillard';
    if (weatherCode >= 51 && weatherCode <= 55) return 'Bruine';
    if (weatherCode >= 56 && weatherCode <= 57) return 'Bruine verglaçante';
    if (weatherCode >= 61 && weatherCode <= 65) return 'Pluie';
    if (weatherCode >= 66 && weatherCode <= 67) return 'Pluie verglaçante';
    if (weatherCode >= 71 && weatherCode <= 75) return 'Chute de neige';
    if (weatherCode >= 77 && weatherCode <= 77) return 'Grains de neige';
    if (weatherCode >= 80 && weatherCode <= 82) return 'Averses de pluie';
    if (weatherCode >= 85 && weatherCode <= 86) return 'Averses de neige';
    if (weatherCode >= 95 && weatherCode <= 96) return 'Orage';
    if (weatherCode === 99) return 'Orage avec grêle';
    return 'Météo inconnue';
  }
}
