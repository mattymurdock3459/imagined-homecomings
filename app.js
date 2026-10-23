/* Exhibition layout and document readers. Your writing belongs in content.js. */
(() => {
  'use strict';
  const content = window.HOMECOMINGS_CONTENT;
  if (!content || !Array.isArray(content.songs)) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const readers = [];
  let pdfLibraryPromise;
  let expandedReader = null;
  let resizeTimer;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function writeParagraphs(node, text, placeholder) {
    if (!text || !text.trim()) {
      node.append(element('p', 'empty-copy', placeholder));
      return;
    }
    text.trim().split(/\n\s*\n/).forEach(paragraph => {
      const p = element('p', '', paragraph.trim());
      p.style.whiteSpace = 'pre-line';
      node.append(p);
    });
  }

  function control(text, label, className) {
    const button = element('button', className, text);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    return button;
  }

  function safeSourceUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch (_) { return null; }
  }

  document.title = content.title + ' — ' + content.subtitle;
  const title = document.getElementById('exhibition-title');
  if (content.title !== 'Imagined Homecomings') title.textContent = content.title;
  document.getElementById('exhibition-subtitle').textContent = content.subtitle;
  if (content.author && content.author.trim()) {
    document.getElementById('author-credit').textContent = ' · ' + content.author.trim();
  }
  writeParagraphs(document.getElementById('about-overview'), content.about.overview, 'Project overview forthcoming.');
  writeParagraphs(document.getElementById('about-methodology'), content.about.methodology, 'Methodology forthcoming.');
  writeParagraphs(document.getElementById('about-reasoning'), content.about.reasoning, 'Project reasoning forthcoming.');
  writeParagraphs(document.getElementById('closing-copy'), content.closingThoughts, 'Closing thoughts forthcoming.');

  const jumpList = document.getElementById('jump-list');
  const sections = document.getElementById('song-sections');
  const menu = document.querySelector('.jump-menu');
  const dialog = document.getElementById('reader-dialog');

  function getPdfLibrary() {
    if (!pdfLibraryPromise) {
      pdfLibraryPromise = import(new URL('assets/vendor/pdf.mjs', document.baseURI).href).then(library => {
        library.GlobalWorkerOptions.workerSrc = new URL('assets/vendor/pdf.worker.mjs', document.baseURI).href;
        return library;
      });
    }
    return pdfLibraryPromise;
  }

  class SongReader {
    constructor(song, section) {
      this.song = song;
      this.section = section;
      this.page = 1;
      this.pageCount = song.pageCount;
      this.zoom = 1;
      this.documentPromise = null;
      this.renderTask = null;
      this.revision = 0;
      this.fallback = location.protocol === 'file:';
      this.build();
    }

    build() {
      const song = this.song;
      this.node = element('div', 'viewer');
      this.node.setAttribute('role', 'group');
      this.node.setAttribute('aria-label', song.title + ', sheet music reader');
      const toolbar = element('div', 'viewer-toolbar');
      toolbar.append(element('p', 'viewer-label', 'Sheet music'));
      this.zoomOut = control('−', 'Zoom out', 'icon-button');
      const fit = control('Fit', 'Fit the whole page', 'fit-button');
      this.zoomIn = control('+', 'Zoom in', 'icon-button');
      const divider = element('span', 'zoom-divider');
      divider.setAttribute('aria-hidden', 'true');
      this.expand = control('⛶', 'Expand reader', 'icon-button expand-button');
      const original = element('a', 'icon-button pdf-link', '↗');
      original.href = song.pdf;
      original.target = '_blank';
      original.rel = 'noopener';
      original.title = 'Open original PDF';
      original.setAttribute('aria-label', 'Open original PDF: ' + song.title + ' (new tab)');
      toolbar.append(this.zoomOut, fit, this.zoomIn, divider, this.expand, original);

      this.stage = element('div', 'reader-stage');
      this.stage.tabIndex = 0;
      this.stage.setAttribute('role', 'group');
      this.stage.setAttribute('aria-label', 'PDF page. Use left and right arrow keys to turn pages; zoom controls are above.');
      this.surface = element('div', 'page-surface');
      this.image = element('img');
      this.image.decoding = 'async';
      this.image.loading = 'lazy';
      this.image.src = this.pageImage(1);
      this.image.alt = 'Page 1 of ' + this.pageCount + ' — ' + song.title;
      this.canvas = element('canvas');
      this.canvas.hidden = true;
      this.canvas.setAttribute('role', 'img');
      this.surface.append(this.image, this.canvas);
      this.stage.append(this.surface);

      const footer = element('div', 'viewer-footer');
      this.previous = control('', 'Previous page', 'page-button');
      this.previous.append(element('span', 'arrow', '←'), document.createTextNode('Previous'));
      this.previous.querySelector('span').setAttribute('aria-hidden', 'true');
      this.next = control('', 'Next page', 'page-button');
      this.next.append(document.createTextNode('Next'), element('span', 'arrow', '→'));
      this.next.querySelector('span').setAttribute('aria-hidden', 'true');
      this.counter = element('p', 'page-counter');
      this.counter.setAttribute('aria-live', 'polite');
      this.counter.setAttribute('aria-atomic', 'true');
      footer.append(this.previous, this.counter, this.next);
      this.note = element('p', 'viewer-note', 'Page images shown. Use ↗ to open the original PDF.');
      this.node.append(toolbar, this.stage, footer, this.note);

      this.previous.addEventListener('click', () => this.changePage(-1));
      this.next.addEventListener('click', () => this.changePage(1));
      this.zoomOut.addEventListener('click', () => this.setZoom(this.zoom - .25));
      this.zoomIn.addEventListener('click', () => this.setZoom(this.zoom + .25));
      fit.addEventListener('click', () => this.setZoom(1));
      this.expand.addEventListener('click', () => expandReader(this));
      this.stage.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === 'ArrowLeft') { event.preventDefault(); this.changePage(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); this.changePage(1); }
        if (event.key === 'Home') { event.preventDefault(); this.goTo(1); }
        if (event.key === 'End') { event.preventDefault(); this.goTo(this.pageCount); }
      });
      this.image.addEventListener('load', () => this.fitSurface());
      this.syncControls();
      this.fitSurface();
    }

    pageImage(page) { return 'assets/pages/' + this.song.id + '/' + page + '.webp'; }

    syncControls() {
      this.previous.disabled = this.page <= 1;
      this.next.disabled = this.page >= this.pageCount;
      this.zoomOut.disabled = this.zoom <= 1;
      this.zoomIn.disabled = this.zoom >= 3;
      this.counter.textContent = 'Page ' + this.page + ' of ' + this.pageCount;
      this.stage.setAttribute('aria-label', 'Page ' + this.page + ' of ' + this.pageCount + ' — ' + this.song.title + '. Left and right arrow keys turn pages.');
    }

    fitSurface(ratio) {
      const width = Math.max(40, this.stage.clientWidth - (window.innerWidth <= 600 ? 28 : 40));
      const height = Math.max(40, this.stage.clientHeight - (window.innerWidth <= 600 ? 28 : 40));
      const imageRatio = ratio || (this.image.naturalWidth / this.image.naturalHeight) || .75;
      const fittedWidth = Math.min(width, height * imageRatio) * this.zoom;
      this.surface.style.width = fittedWidth + 'px';
      this.surface.style.height = fittedWidth / imageRatio + 'px';
      return {width: fittedWidth, height: fittedWidth / imageRatio};
    }

    setZoom(value) {
      this.zoom = Math.min(3, Math.max(1, value));
      this.syncControls();
      this.render();
    }

    changePage(change) { this.goTo(this.page + change); }

    goTo(page) {
      const nextPage = Math.min(this.pageCount, Math.max(1, page));
      if (nextPage === this.page) return;
      this.page = nextPage;
      this.zoom = 1;
      this.image.alt = 'Page ' + this.page + ' of ' + this.pageCount + ' — ' + this.song.title;
      this.image.src = this.pageImage(this.page);
      this.image.removeAttribute('aria-hidden');
      this.canvas.hidden = true;
      this.syncControls();
      this.stage.scrollTop = 0;
      this.stage.scrollLeft = 0;
      this.render();
      const following = this.page + 1;
      if (following <= this.pageCount) { const preload = new Image(); preload.src = this.pageImage(following); }
    }

    async loadDocument() {
      if (!this.documentPromise) {
        this.documentPromise = getPdfLibrary().then(library => library.getDocument({
          url: new URL(this.song.pdf, document.baseURI).href,
          standardFontDataUrl: new URL('assets/vendor/standard_fonts/', document.baseURI).href,
          wasmUrl: new URL('assets/vendor/wasm/', document.baseURI).href,
          isEvalSupported: false
        }).promise);
      }
      return this.documentPromise;
    }

    async render() {
      const revision = ++this.revision;
      if (this.renderTask) {
        const previous = this.renderTask;
        this.renderTask = null;
        previous.cancel();
        try { await previous.promise; } catch (_) { /* Cancellation is expected. */ }
      }
      if (revision !== this.revision) return;
      this.fitSurface();
      if (this.fallback) {
        this.canvas.hidden = true;
        this.node.dataset.renderMode = 'page-image';
        return;
      }
      try {
        const pdf = await this.loadDocument();
        if (revision !== this.revision) return;
        this.pageCount = pdf.numPages;
        this.syncControls();
        const page = await pdf.getPage(this.page);
        if (revision !== this.revision) return;
        const natural = page.getViewport({scale: 1});
        const size = this.fitSurface(natural.width / natural.height);
        const density = Math.min(window.devicePixelRatio || 1, 2);
        const renderScale = Math.min(size.width * density / natural.width, 4000 / natural.width, 5000 / natural.height);
        const viewport = page.getViewport({scale: renderScale});
        this.canvas.width = Math.ceil(viewport.width);
        this.canvas.height = Math.ceil(viewport.height);
        this.canvas.setAttribute('aria-label', 'Page ' + this.page + ' of ' + this.pageCount + ' — ' + this.song.title);
        const renderTask = page.render({canvasContext: this.canvas.getContext('2d'), viewport});
        this.renderTask = renderTask;
        await renderTask.promise;
        if (revision !== this.revision) return;
        this.renderTask = null;
        this.canvas.hidden = false;
        this.image.setAttribute('aria-hidden', 'true');
        this.node.dataset.renderMode = 'pdf';
        this.node.classList.remove('has-fallback');
      } catch (error) {
        if (revision !== this.revision || error.name === 'RenderingCancelledException') return;
        this.fallback = true;
        this.canvas.hidden = true;
        this.image.removeAttribute('aria-hidden');
        this.node.dataset.renderMode = 'page-image';
        this.node.classList.add('has-fallback');
        console.warn('Original PDF rendering unavailable for ' + this.song.id + '; using its pre-rendered pages.', error);
      }
    }
  }

  content.songs.forEach((song, index) => {
    const number = String(index + 1).padStart(2, '0');
    const section = element('section', 'song-section' + (index % 2 ? ' reverse' : ''));
    section.id = song.id;
    section.setAttribute('aria-labelledby', song.id + '-title');
    const grid = element('div', 'song-grid section-shell');
    const heading = element('header', 'song-heading');
    heading.append(element('p', 'song-number', number + ' / ' + String(content.songs.length).padStart(2, '0')));
    const title = element('h3', '', song.title);
    title.id = song.id + '-title';
    const themeLabel = element('span', 'theme-label', 'Theme');
    const theme = element('span', 'theme-chip' + (song.theme.trim() ? '' : ' is-empty'), song.theme.trim() || 'To be added');
    heading.append(title, themeLabel, theme);

    const commentary = element('div', 'song-commentary');
    commentary.append(element('span', 'field-label', 'Commentary'));
    const commentaryCopy = element('div', 'prose');
    writeParagraphs(commentaryCopy, song.commentary, 'Commentary forthcoming.');
    commentary.append(commentaryCopy);
    const citation = element('footer', 'song-citation');
    citation.append(element('span', 'field-label', 'Citation'));
    const citationCopy = element('div', 'prose');
    writeParagraphs(citationCopy, song.citation, 'Citation forthcoming.');
    citation.append(citationCopy);
    const source = safeSourceUrl(song.sourceUrl);
    if (source) {
      const sourceLink = element('a', 'source-link', 'View archival record ↗');
      sourceLink.href = source;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener';
      citation.append(sourceLink);
    }

    const reader = new SongReader(song, section);
    readers.push(reader);
    grid.append(heading, reader.node, commentary, citation);
    section.append(grid);
    sections.append(section);
    reader.fitSurface();

    const item = element('li');
    const link = element('a');
    link.href = '#' + song.id;
    link.append(element('span', 'jump-number', number), element('span', '', song.title));
    item.append(link);
    jumpList.append(item);
    link.addEventListener('click', () => { menu.open = false; });
  });

  function expandReader(reader) {
    if (expandedReader) return;
    expandedReader = reader;
    reader.homeMarker = document.createComment('Reader returns here');
    reader.node.before(reader.homeMarker);
    document.getElementById('dialog-title').textContent = reader.song.title;
    dialog.querySelector('.dialog-body').append(reader.node);
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    reader.render();
  }

  dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    const reader = expandedReader;
    if (!reader) return;
    reader.homeMarker.replaceWith(reader.node);
    expandedReader = null;
    document.body.style.overflow = '';
    reader.render();
    reader.expand.focus({preventScroll: true});
  });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') menu.open = false; });

  const readerObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const reader = readers.find(item => item.section === entry.target);
      if (reader) reader.render();
      readerObserver.unobserve(entry.target);
    });
  }, {rootMargin: '450px 0px'});
  readers.forEach(reader => readerObserver.observe(reader.section));

  const activeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      jumpList.querySelectorAll('a').forEach(link => {
        if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      if (!reducedMotion.matches) entry.target.querySelector('.song-grid').classList.add('just-arrived');
    });
  }, {rootMargin: '-15% 0px -55% 0px'});
  readers.forEach(reader => activeObserver.observe(reader.section));

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      readers.forEach(reader => {
        const rect = reader.node.getBoundingClientRect();
        if (rect.top < innerHeight + 100 && rect.bottom > -100) reader.render();
        else reader.fitSurface();
      });
    }, 160);
  });

  const progress = document.querySelector('.reading-progress span');
  let scrollScheduled = false;
  function updateScroll() {
    scrollScheduled = false;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (height > 0 ? Math.min(1, window.scrollY / height) : 0) + ')';
    if (!reducedMotion.matches && window.scrollY < 900) {
      document.querySelector('.hero-art').style.setProperty('--hero-shift', Math.min(30, window.scrollY * .09) + 'px');
    }
  }
  window.addEventListener('scroll', () => {
    if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateScroll); }
  }, {passive: true});
  updateScroll();
  if (location.hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView({behavior: 'instant'});
    });
  }
})();
