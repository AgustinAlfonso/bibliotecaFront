import { Routes } from '@angular/router';
import { BooksComponent } from './books/books.component';

export const routes: Routes = [
  { path: '', component: BooksComponent },  // Route to display the BooksComponent
  { path: '**', redirectTo: '' }            // Catch-all route to redirect to the Books page
];
