import {
  Component, signal, computed, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, ChangeDetectionStrategy, Inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base.token';

interface Book {
  id: number;
  pages?: number;
  author?: string;
  title: string;
  genre?: string;
  filename: string;
}

interface Page<T> {
  items: T[];
  total: number;
}

interface PdfResponse {
  filename: string;
  content: string; // base64
  contentType: string;
  size: number;
}

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './books.component.html',
  styleUrls: ['./books.component.css']
})
export class BooksComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scroller', { static: true }) scrollerRef!: ElementRef<HTMLElement>;
  @ViewChild('bottomSentinel', { static: true }) bottomSentinelRef!: ElementRef<HTMLElement>;

  // Config scroll
  readonly NEAR_TOP_PX = 800;
  readonly MAX_STEPS_PER_CYCLE = 5;
  pageSize = 100;

  // Estado
  total = signal(0);
  currentPage = signal(1);
  loading = signal(false);
  error = signal<string>('');

  // Estado diagnóstico de API
  apiStatus = signal<{ ok: boolean; msg: string }>({ ok: true, msg: '' });

  // Filtros
  search = signal<string>('');         // busca por título o autor (server-side)
  genreFilter = signal<string>('');
  genreDropdownOpen = signal<boolean>(false);
  letterFilter = signal<string>('');   // '', '#', 'A'..'Z'
  readonly letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'] as const;

  // Computed: hay filtros activos?
  hasActiveFilters = computed(() => {
    return !!(this.search() || this.genreFilter() || this.letterFilter());
  });

  // Géneros
  taxoLoading = signal(true);
  genres  = signal<string[]>([]);
  private TAXO_TTL_MS = 1000 * 60 * 60 * 24; // 24h
  private LS_GENRES_KEY  = 'taxo_genres_v1';

  // Cache páginas libros
  private cache = signal(new Map<number, Book[]>());
  private loadingPages = new Set<number>();
  private ioBottom?: IntersectionObserver;
  private prevChain = Promise.resolve();
  private requestVersion = 0;

  // Ventana visible
  visibleBooks = computed(() => {
    const p = this.currentPage();
    const keep = [p - 1, p, p + 1].filter(x => x >= 1);
    const out: Book[] = [];
    const map = this.cache();
    for (const k of keep) {
      const page = map.get(k);
      if (page) {
        out.push(...page);
      }
    }
    return out;
  });

  // Página realmente visible basada en el scroll
  visiblePage = signal(1);

  // debounce search
  private searchTimer?: ReturnType<typeof setTimeout>;

  // Scroll event listener cleanup
  private scrollHandler?: () => void;

  // Document click listener para cerrar menú
  private documentClickHandler?: () => void;

  // Estado del menú de descarga
  openDownloadMenu = signal<number | null>(null);
  private menuElement?: HTMLElement;

  // URL base efectiva (con fallback a origin)
  public readonly baseUrl: string;

  constructor(
    @Inject(API_BASE_URL) apiBaseFromProvider: string,
    private http: HttpClient,
  ) {
    // Fallback: si no seteaste la URL en main.ts, usa el origin actual
    this.baseUrl = (apiBaseFromProvider && apiBaseFromProvider.trim())
      ? apiBaseFromProvider.trim().replace(/\/+$/,'')
      : window.location.origin;

    console.log('[BooksComponent] API base URL =>', this.baseUrl);

    this.loadGenres().finally(() => {
      this.resetAndLoad();
    });
  }

  /* ========== Géneros ========== */
  private async loadGenres() {
    this.taxoLoading.set(true);
    try {
      const fromCache = <T>(k:string)=> {
        try {
          const raw = localStorage.getItem(k);
          if (!raw) return null;
          const { ts, data } = JSON.parse(raw);
          if (!ts || !data) return null;
          if (Date.now() - ts > this.TAXO_TTL_MS) return null;
          return Array.isArray(data) ? data as T : null;
        } catch { return null; }
      };

      const cached = fromCache<string[]>(this.LS_GENRES_KEY);
      if (cached) this.genres.set(cached);

      const url = `${this.baseUrl}/api/genres`;
      console.log('[GET]', url);
      const list = await firstValueFrom(this.http.get<string[]>(url));
      if (Array.isArray(list)) {
        const data = [...new Set(list.map(g => g?.trim()).filter(Boolean) as string[])]
          .sort((a,b)=>a.localeCompare(b));
        this.genres.set(data);
        localStorage.setItem(this.LS_GENRES_KEY, JSON.stringify({ ts: Date.now(), data }));
      }
    } catch (e: unknown) {
      console.error('loadGenres error:', e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.apiStatus.set({ ok: false, msg: `Error cargando géneros: ${errorMsg}` });
    } finally {
      this.taxoLoading.set(false);
    }
  }

  /* ========== Filtros UI ========== */
  onSearchInput(v: string) {
    this.search.set(v);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.resetAndLoad(), 250);
  }
  clearSearch() {
    if (!this.search()) return;
    this.search.set('');
    this.resetAndLoad();
  }

  onGenreChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.genreFilter.set(value || '');
    this.resetAndLoad();
  }

  selectGenre(genre: string) {
    this.genreFilter.set(genre || '');
    this.genreDropdownOpen.set(false);
    this.resetAndLoad();
  }

  toggleGenreDropdown() {
    this.genreDropdownOpen.update(v => !v);
  }

  closeGenreDropdown() {
    this.genreDropdownOpen.set(false);
  }

  clearGenre() {
    this.genreFilter.set('');
    this.resetAndLoad();
  }

  clearAllFilters() {
    this.search.set('');
    this.genreFilter.set('');
    this.letterFilter.set('');
    this.resetAndLoad();
  }

  private updateVisiblePage() {
    const el = this.scrollerRef?.nativeElement;
    if (!el || !this.visibleBooks().length) {
      this.visiblePage.set(1);
      return;
    }

    // Calcular qué página está visible basándome en el scroll
    const scrollTop = el.scrollTop;
    const clientHeight = el.clientHeight;
    const scrollHeight = el.scrollHeight;
    
    // Si estamos al inicio, es la página 1
    if (scrollTop < 100) {
      this.visiblePage.set(1);
      return;
    }
    
    // Calcular qué porcentaje del contenido se ha scrolleado
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    
    // Calcular qué página corresponde a ese porcentaje
    const currentP = this.currentPage();
    const totalPages = Math.ceil(this.total() / this.pageSize);
    
    // visibleBooks contiene páginas [p-1, p, p+1]
    // Calcular en qué parte del rango visible estamos
    const booksPerPage = this.pageSize;
    const totalVisibleBooks = this.visibleBooks().length;
    
    // Estimar qué índice de libro está en el viewport
    // Usar una altura aproximada de fila (ajustar según necesidad)
    const estimatedRowHeight = scrollHeight / totalVisibleBooks;
    const visibleStartIndex = Math.floor(scrollTop / estimatedRowHeight);
    
    // Calcular qué página corresponde
    let calculatedPage = currentP;
    if (visibleStartIndex < booksPerPage) {
      // Está en la página anterior (p-1)
      calculatedPage = Math.max(1, currentP - 1);
    } else if (visibleStartIndex < booksPerPage * 2) {
      // Está en la página actual (p)
      calculatedPage = currentP;
    } else if (visibleStartIndex < booksPerPage * 3) {
      // Está en la página siguiente (p+1)
      calculatedPage = Math.min(totalPages, currentP + 1);
    } else {
      // Por defecto, usar currentPage
      calculatedPage = currentP;
    }
    
    this.visiblePage.set(calculatedPage);
  }

  toggleLetter(l: string) {
    this.letterFilter.set(this.letterFilter() === l ? '' : l);
    this.resetAndLoad();
  }

  clearLetter() {
    this.letterFilter.set('');
    this.resetAndLoad();
  }

  trackById = (_: number, b: Book) => b.id;
  trackByText = (_: number, s: string) => s;

  /* ========== Lifecycle / scroll ========== */
  ngAfterViewInit(): void {
    const root = this.scrollerRef.nativeElement;

    // infinito hacia abajo
    this.ioBottom = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            this.advanceIfNeeded();
          }
        });
      },
      { root, rootMargin: '1000px', threshold: 0.01 }
    );
    this.ioBottom.observe(this.bottomSentinelRef.nativeElement);

    // cargar hacia arriba cuando estás cerca del top y actualizar página visible
    this.scrollHandler = () => {
      const el = this.scrollerRef.nativeElement;
      if (el.scrollTop <= this.NEAR_TOP_PX && this.currentPage() > 1) {
        this.queuePrevWork();
      }
      this.updateVisiblePage();
    };
    root.addEventListener('scroll', this.scrollHandler, { passive: true });
    
    // Actualizar página visible inicialmente
    setTimeout(() => this.updateVisiblePage(), 100);

    // Cerrar menú de descarga y dropdown de géneros al hacer click fuera
    this.documentClickHandler = () => {
      this.closeDownloadMenu();
      this.closeGenreDropdown();
    };
    document.addEventListener('click', this.documentClickHandler);
  }

  ngOnDestroy(): void {
    // Cleanup: IntersectionObserver
    this.ioBottom?.disconnect();
    
    // Cleanup: scroll event listener
    if (this.scrollHandler) {
      this.scrollerRef?.nativeElement?.removeEventListener('scroll', this.scrollHandler);
    }
    
    // Cleanup: document click listener
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
    }
    
    // Cleanup: search timer
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    
    // Cleanup: menu
    this.removeMenu();
    
    // Cancel pending requests
    this.requestVersion++;
    this.loadingPages.clear();
  }

  /* ========== Reset + carga p1 ========== */
  private resetAndLoad() {
    this.currentPage.set(1);
    this.visiblePage.set(1);
    this.total.set(0);
    this.cache.set(new Map());
    if (this.scrollerRef?.nativeElement) {
      this.scrollerRef.nativeElement.scrollTop = 0;
    }
    this.requestVersion++;
    this.fetchPage(1).then(() => this.fillViewport());
  }

  // Llenar viewport si p1 no alcanza
  private async fillViewport() {
    const el = this.scrollerRef.nativeElement;
    let guard = 0;
    while (
      el.scrollHeight <= el.clientHeight &&
      (this.currentPage() * this.pageSize) < this.total() &&
      guard < 10
    ) {
      const next = this.currentPage() + 1;
      await this.fetchPage(next);
      this.currentPage.set(next);
      this.trimCache();
      guard++;
    }
    this.prefetchNext();
  }

  /* ========== Scroll DOWN / UP ========== */
  private async advanceIfNeeded() {
    if (this.currentPage() * this.pageSize >= this.total()) return;
    const next = this.currentPage() + 1;
    if (!this.cache().get(next)) await this.fetchPage(next);
    this.currentPage.set(next);
    this.trimCache();
    this.prefetchNext();
  }
  private async prefetchNext() {
    const n = this.currentPage() + 1;
    if (!this.cache().get(n)) await this.fetchPage(n);
  }
  private queuePrevWork() {
    this.prevChain = this.prevChain.then(() => this.stepPrevWhileNeeded()).catch(() => {});
  }
  private async stepPrevWhileNeeded() {
    const el = this.scrollerRef.nativeElement;
    let steps = 0;
    while (el.scrollTop <= this.NEAR_TOP_PX && this.currentPage() > 1 && steps < this.MAX_STEPS_PER_CYCLE) {
      const prev = this.currentPage() - 1;

      if (!this.cache().get(prev)) {
        const before = el.scrollHeight;
        await this.fetchPage(prev);
        const after = el.scrollHeight;
        el.scrollTop += (after - before);
      }

      this.currentPage.set(prev);
      this.trimCache();

      const pprev = prev - 1;
      if (pprev >= 1 && !this.cache().get(pprev)) {
        await this.fetchPage(pprev);
      }
      steps++;
    }
    if (el.scrollTop <= this.NEAR_TOP_PX && this.currentPage() > 1) {
      queueMicrotask(() => this.queuePrevWork());
    }
  }

  private trimCache() {
    const p = this.currentPage();
    const keep = new Set([p - 1, p, p + 1].filter(x => x >= 1));
    const newMap = new Map<number, Book[]>();
    for (const [k, v] of this.cache()) {
      if (keep.has(k)) {
        newMap.set(k, v);
      }
    }
    this.cache.set(newMap);
  }

  /* ========== Data fetch ========== */
  private normalize = (book: unknown): Book => {
    const b = book as Record<string, unknown>;
    return {
      id: (b['id'] ?? b['ID'] ?? 0) as number,
      pages: (b['pages'] ?? b['pageCount']) as number | undefined,
      author: (b['author'] ?? b['Author'] ?? '') as string,
      title: (b['title'] ?? b['Titulo'] ?? b['name'] ?? '') as string,
      genre: (b['genre'] ?? b['Genre'] ?? '') as string,
      filename: (b['filename'] ?? b['file'] ?? b['path'] ?? '') as string
    };
  };

  private async fetchPage(p: number): Promise<void> {
    if (p < 1) return;
    if (this.loadingPages.has(p)) return;

    this.loadingPages.add(p);
    this.loading.set(true);
    const myVersion = this.requestVersion;

    try {
      let params = new HttpParams()
        .set('page', String(p))
        .set('pageSize', String(this.pageSize))
        .set('sortBy', 'title'); // Ordenar por título
      if (this.search()) params = params.set('search', this.search());
      if (this.genreFilter()) params = params.set('genre', this.genreFilter());
      if (this.letterFilter()) params = params.set('letter', this.letterFilter());

      const url = `${this.baseUrl}/api/books`;
      console.log('[GET]', url, params.toString());
      const res = await firstValueFrom(this.http.get<Page<unknown>>(url, { params }));

      if (this.requestVersion !== myVersion) return;
      if (!res || !Array.isArray(res.items)) throw new Error('Respuesta inesperada');

      const map = new Map(this.cache());
      map.set(p, res.items.map(this.normalize));
      this.cache.set(map);

      if (this.total() !== res.total) this.total.set(res.total);
      if (!this.apiStatus().ok) this.apiStatus.set({ ok: true, msg: '' });
    } catch (e: unknown) {
      console.error('fetchPage error:', e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.apiStatus.set({
        ok: false,
        msg: `Error al cargar libros: ${errorMsg}`
      });
      this.error.set(errorMsg);
    } finally {
      this.loadingPages.delete(p);
      if (this.requestVersion === myVersion) this.loading.set(false);
    }
  }

  /* ========== Descargas ========== */
  buildDownloadUrl(id: number | string): string {
    return `${this.baseUrl}/api/books/${id}/download`;
  }

  toggleDownloadMenu(bookId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const isOpening = this.openDownloadMenu() !== bookId;
    
    if (isOpening) {
      this.openDownloadMenu.set(bookId);
      const target = event.target as HTMLElement;
      const button = target.closest('.download-btn') as HTMLElement;
      if (button) {
        const rect = button.getBoundingClientRect();
        this.createMenu(bookId, rect);
      }
    } else {
      this.closeDownloadMenu();
    }
  }

  private createMenu(bookId: number, buttonRect: DOMRect): void {
    // Eliminar menú anterior si existe
    this.removeMenu();
    
    // Crear contenedor del menú
    const menu = document.createElement('div');
    menu.className = 'download-menu-portal';
    menu.style.cssText = `
      position: fixed;
      top: ${buttonRect.bottom + 4}px;
      left: ${buttonRect.left}px;
      z-index: 100000;
      background: #ffffff;
      border: 2px solid #586D51;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(88, 109, 81, 0.3);
      min-width: 180px;
      overflow: hidden;
    `;
    
    // Crear botones
    const book = this.visibleBooks().find(b => b.id === bookId);
    if (!book) return;
    
    const epubBtn = document.createElement('button');
    epubBtn.className = 'download-option';
    epubBtn.textContent = '📖 Descargar EPUB';
    epubBtn.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px 16px;
      background: #fff;
      border: none;
      text-align: left;
      cursor: pointer;
      color: #586D51;
      font: inherit;
      font-weight: 500;
      transition: all 0.2s;
    `;
    epubBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.downloadEpub(bookId, book.filename, e);
    };
    
    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'download-option';
    pdfBtn.textContent = '📄 Descargar PDF';
    pdfBtn.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px 16px;
      background: #fff;
      border: none;
      text-align: left;
      cursor: pointer;
      color: #586D51;
      font: inherit;
      font-weight: 500;
      transition: all 0.2s;
    `;
    pdfBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.downloadPdf(bookId, book.filename, e);
    };
    
    epubBtn.onmouseenter = () => {
      epubBtn.style.background = '#E8F0E5';
      epubBtn.style.color = '#45523D';
    };
    epubBtn.onmouseleave = () => {
      epubBtn.style.background = '#fff';
      epubBtn.style.color = '#586D51';
    };
    pdfBtn.onmouseenter = () => {
      pdfBtn.style.background = '#E8F0E5';
      pdfBtn.style.color = '#45523D';
    };
    pdfBtn.onmouseleave = () => {
      pdfBtn.style.background = '#fff';
      pdfBtn.style.color = '#586D51';
    };
    
    menu.appendChild(epubBtn);
    menu.appendChild(pdfBtn);
    
    document.body.appendChild(menu);
    this.menuElement = menu;
  }

  private removeMenu(): void {
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = undefined;
    }
  }

  closeDownloadMenu(): void {
    this.openDownloadMenu.set(null);
    this.removeMenu();
  }

  async downloadEpub(bookId: number, filename: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.closeDownloadMenu();
    
    try {
      const url = this.buildDownloadUrl(bookId);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `book_${bookId}.epub`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: unknown) {
      console.error('Error descargando EPUB:', e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.apiStatus.set({
        ok: false,
        msg: `Error al descargar EPUB: ${errorMsg}`
      });
    }
  }

  async downloadPdf(bookId: number, filename: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.closeDownloadMenu();
    
    try {
      this.loading.set(true);
      const url = `${this.baseUrl}/api/books/${bookId}/pdf`;
      console.log('[GET]', url);
      
      const response = await firstValueFrom(this.http.get<PdfResponse>(url));
      
      if (!response.content) {
        throw new Error('No se recibió contenido del PDF');
      }

      // Convertir base64 a blob
      const byteCharacters = atob(response.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: response.contentType || 'application/pdf' });

      // Crear link de descarga
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = response.filename || filename || `book_${bookId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL del objeto
      window.URL.revokeObjectURL(downloadUrl);
      
      if (!this.apiStatus().ok) {
        this.apiStatus.set({ ok: true, msg: '' });
      }
    } catch (e: unknown) {
      console.error('Error descargando PDF:', e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.apiStatus.set({
        ok: false,
        msg: `Error al descargar PDF: ${errorMsg}`
      });
    } finally {
      this.loading.set(false);
    }
  }
}
