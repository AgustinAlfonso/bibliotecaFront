import { Component } from '@angular/core';
import { BooksComponent } from './books/books.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [BooksComponent],
  template: `<app-books />`,
})
export class AppComponent {}
