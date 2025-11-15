import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Books } from './books';

describe('Books', () => {
  let component: Books;
  let fixture: ComponentFixture<Books>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Books]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Books);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
