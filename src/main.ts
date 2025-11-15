import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { API_BASE_URL } from './app/api-base.token';
import { environment } from './environments/environment';
import 'zone.js';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
  ],
}).catch((err) => console.error('Bootstrap error:', err));
