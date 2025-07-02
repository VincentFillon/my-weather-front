import { TenorGif } from './tenor-gif';

export interface TenorResponse {
  locale?: string;
  results: TenorGif[];
  next: string;
}
