(() => {
  if (customElements.get('experience-card')) return;

  class ExperienceCard extends HTMLElement {
    static get observedAttributes() {
      return ['title','description','price','time','filters','tag','images','duration','autoplay'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mounted = false;
      this._current = 0;
      this._slides = [];
      this._duration = 5000; // ms per slide
      this._autoplay = true;
      this._raf = null;
      this._progress = 0; // 0..1 progress of current slide
      this._lastTick = 0;
      this._isPaused = false;
      this._render();
    }

    connectedCallback() {
      this._readAll();
      this._mount();
      this._mounted = true;
      this._updateUI();
      this._observeResize();
      this._initCarousel();
      this._bindStoryGestures();
    }

    disconnectedCallback() {
      if (this._ro) this._ro.disconnect();
      this._stopAutoplay();
    }

    attributeChangedCallback(name, _oldValue, _newValue) {
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();

      if (name === 'images') {
        this._applyImages();
        const slot = this.shadowRoot.querySelector('slot');
        this._slides = slot.assignedElements({ flatten:true });
        this._renderStoryBars();
        this._show(0, true);
      }
      if (name === 'duration' || name === 'autoplay') {
        this._syncAutoplayState();
      }
    }

    // --------- props ---------
    _readAll() {
      this._title = this.getAttribute('title') || 'Titolo esperienza';
      this._desc  = this.getAttribute('description') || 'Descrizione breve...';
      this._price = this.getAttribute('price') || 'Prezzo su richiesta';
      this._time  = this.getAttribute('time')  || '6 persone';

      const raw = this.getAttribute('filters') || this.getAttribute('tag') || '';
      this._filters = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);

      const imgs = (this.getAttribute('images') || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      this._images = imgs;

      const dur = parseInt(this.getAttribute('duration') || '5000', 10);
      this._duration = Number.isFinite(dur) ? Math.max(1200, dur) : 5000;
      // autoplay on by default unless explicitly set to "false"
      const ap = this.getAttribute('autoplay');
      this._autoplay = ap === null ? true : ap !== 'false';
    }

    // --------- template ---------
    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{
            --glow-dur:.30s;
            --glow-rgb:0,160,255;

            inline-size: var(--card-w, 280px);
            display:flex; border-radius:16px;
            position:relative; overflow:visible;
            transform:scale(var(--s,1));
            transform-origin:center center;
            transition:transform .28s cubic-bezier(.22,.61,.36,1);
            background:#0b1220; color:#fff;
            font-family:system-ui, sans-serif; box-shadow:0 10px 30px rgba(0,0,0,.35);
            will-change: transform;
            aspect-ratio: 16 / 9;
            height: 450px;
            width: 90%;
            user-select:none;
            -webkit-user-select:none;
          }

          @media (hover: hover) and (pointer: fine){
            :host(:hover){ transform: scale(1.07); }
          }
          @media (hover: none) and (pointer: coarse){
            :host([data-active]){ transform: scale(1.08); }
          }

          :host::before{
            content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
            z-index:3; opacity:0; transform:scale(1);
            background:
              radial-gradient(82% 72% at 50% 106%, rgba(var(--glow-rgb),.34) 0%, rgba(var(--glow-rgb),.16) 40%, rgba(0,0,0,0) 70%);
            box-shadow:
              0 28px 56px -16px rgba(var(--glow-rgb), .55),
              0 0 0 1.5px       rgba(var(--glow-rgb), .40),
              inset 0 -14px 28px     rgba(var(--glow-rgb), .28);
            transition: opacity var(--glow-dur), transform var(--glow-dur), box-shadow var(--glow-dur), background var(--glow-dur);
          }
          :host([data-active])::before{
            opacity:1; transform:scale(1);
            background:
              radial-gradient(86% 76% at 50% 109%, rgba(var(--glow-rgb),.40) 0%, rgba(var(--glow-rgb),.20) 42%, rgba(0,0,0,0) 72%);
            box-shadow:
              0 34px 70px -18px rgba(var(--glow-rgb), .60),
              0 0 0 1.5px       rgba(var(--glow-rgb), .44),
              inset 0 -16px 32px     rgba(var(--glow-rgb), .32);
          }

          :host::after{
            content:""; position:absolute; inset:0; border-radius:inherit; outline:2px solid rgba(255,255,255,.3);
            outline-offset:-2px; mix-blend-mode:overlay; pointer-events:none; z-index:6;
          }

          .clip{ position:absolute; inset:0; overflow:hidden; border-radius:inherit; }
          .shine{ position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:12; }
          .shine::before{ content:""; position:absolute; top:-150%; left:-50%; width:200%; height:150%;
            background:linear-gradient(120deg,transparent 20%,rgba(255,255,255,.55) 50%,transparent 80%);
            transform:rotate(25deg); opacity:0; }
          :host([data-active]) .shine::before{ animation:shine-slide 1.6s ease-in-out .28s forwards; }
          @keyframes shine-slide{ 0%{top:-150%;opacity:0} 25%{opacity:.85} 55%{top:0%;opacity:.95} 100%{top:150%;opacity:0} }

          /* --- carosello immagini --- */
          .carousel{ position:absolute; inset:0; overflow:hidden; z-index:0; }
          .slides{ display:flex; width:100%; height:100%; transition: transform .45s ease; }
          ::slotted(img[slot="slide"]){ flex:0 0 100%; width:100%; height:100%; object-fit:cover; }

          * { font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif); }

          /* overlay + feather (ombra interna) */
          .overlay{ position:absolute; inset:0; pointer-events:none; z-index:2;
            background:linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.35) 35%,rgba(0,0,0,.10) 60%,rgba(0,0,0,0) 85%); }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%;
            backdrop-filter:blur(14px) saturate(110%); -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12); mask-image:linear-gradient(to top,black 60%,transparent 100%);
            -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%); z-index:2; pointer-events:none; }

          .content{ position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:column; gap:6px; padding:12px; z-index:5; }

          /* === Indicatori stile Storie (segmenti progressivi in alto) === */
          .stories-indicators{ position:absolute; top:16px; left:16px; right:16px; display:flex; gap:6px; z-index:8; }
          .bar{ position:relative; flex:1 1 0; height:3px; background:rgba(255,255,255,.28); border-radius:999px; overflow:hidden; }
          .bar > i{ position:absolute; inset:0; transform-origin:left center; transform:scaleX(0); background:#ffffff; opacity:.95; }
          .bar[aria-current="past"] > i{ transform:scaleX(1); opacity:.9; }
          .bar[aria-current="active"] > i{ will-change: transform; }

          /* Zone cliccabili tipo storie (sinistra/destra) */
          .tapzones{ position:absolute; inset:0; z-index:9; display:grid; grid-template-columns:1fr 1fr; }
          .tapzones > div{ cursor:pointer; }
          .tapzones > div:active{ background:rgba(0,0,0,.08); }

          .filters, .meta{ display:flex; align-items:center; gap:6px; flex-wrap:nowrap; overflow:hidden; margin:0; padding:0; --tag-fs: 11px; }
          .filters{ margin-bottom:2px; }
          .meta{ margin-bottom:4px; }
          .chip, .pill{
            font-size: var(--tag-fs); font-weight:700; line-height:1; white-space:nowrap;
            flex: 0 1 auto; min-width:0; padding:6px 8px; border-radius:999px;
            border:1px solid rgba(16,185,129,.45); letter-spacing:.02em; width: fit-content;
            background:rgba(16,185,129,.15); color: #d1fae5;
          }
          h3{ font-size:18px; margin:0; font-weight:700; line-height:1.18; }
          p{ font-size:14px; margin:0; color:#d1d5db; }
        </style>

        <div class="clip">
          <div class="carousel">
            <div class="slides"><slot name="slide"></slot></div>
          </div>

          <!-- Indicatori Storie -->
          <div class="stories-indicators" id="stories"></div>

          <!-- Zone tap: sinistra/indietro, destra/avanti -->
          <div class="tapzones" aria-hidden="true">
            <div id="tap-left"></div>
            <div id="tap-right"></div>
          </div>

          <div class="overlay"></div>
          <div class="feather"></div>

          <div class="content">
            <div class="filters" part="filters" hidden></div>
            <div class="meta">
              <span class="pill pill-price" part="price"></span>
              <span class="pill pill-time"  part="time"></span>
            </div>

            <h3 part="title"></h3>
            <p part="description"></p>
          </div>

          <div class="shine"></div>
        </div>
      `;
    }

    // --------- refs ---------
    _mount() {
      this.$title = this.shadowRoot.querySelector('h3');
      this.$desc  = this.shadowRoot.querySelector('p');
      this.$filters = this.shadowRoot.querySelector('.filters');
      this.$pillPrice = this.shadowRoot.querySelector('.pill-price');
      this.$pillTime  = this.shadowRoot.querySelector('.pill-time');
      this.$slidesContainer = this.shadowRoot.querySelector('.slides');
      this.$stories = this.shadowRoot.getElementById('stories');
      this.$tapLeft = this.shadowRoot.getElementById('tap-left');
      this.$tapRight = this.shadowRoot.getElementById('tap-right');
    }

    // --------- UI text ---------
    _updateUI() {
      this.$title.textContent = this._title;
      this.$desc.textContent  = this._desc;

      if (this._filters && this._filters.length){
        this.$filters.hidden = false;
        this.$filters.innerHTML = '';
        this._filters.forEach(f => {
          const s = document.createElement('span');
          s.className = 'chip';
          s.textContent = f;
          this.$filters.appendChild(s);
        });
      } else {
        this.$filters.hidden = true;
        this.$filters.innerHTML = '';
      }

      this.$pillPrice.textContent = this._price;
      this.$pillTime.textContent  = this._time;

      this._fitRow(this.$filters);
    }

    // --------- carosello ---------
    _applyImages() {
      if (!this._images || this._images.length === 0) return;
      Array.from(this.querySelectorAll('img[slot="slide"][data-generated="true"]')).forEach(el => el.remove());
      const already = this.querySelector('img[slot="slide"]');
      if (already) return;
      this._images.forEach(src => {
        const img = document.createElement('img');
        img.slot = 'slide';
        img.src = src;
        img.loading = 'lazy';
        img.setAttribute('data-generated', 'true');
        this.appendChild(img);
      });
    }

    _initCarousel() {
      this._applyImages();
      const slot = this.shadowRoot.querySelector('slot');
      this._slides = slot.assignedElements({ flatten:true });

      if (this._slides.length === 0) {
        for (let i=0;i<3;i++) {
          const img = document.createElement('img');
          img.slot = 'slide';
          img.src = `https://picsum.photos/600/400?random=${Math.floor(Math.random()*1000)}`;
          img.setAttribute('data-generated', 'true');
          this.appendChild(img);
        }
        this._slides = slot.assignedElements({ flatten:true });
      }

      // reagisci a cambi slot
      slot.addEventListener('slotchange', () => {
        this._slides = slot.assignedElements({ flatten:true });
        this._renderStoryBars();
        this._show(0, true);
      });

      this._renderStoryBars();
      this._show(0, true);
      this._syncAutoplayState();
    }

    _renderStoryBars(){
      this.$stories.innerHTML = '';
      for (let i=0;i<this._slides.length;i++){
        const bar = document.createElement('div');
        bar.className = 'bar';
        if (i < this._current) bar.setAttribute('aria-current','past');
        else if (i === this._current) bar.setAttribute('aria-current','active');
        bar.appendChild(document.createElement('i'));
        this.$stories.appendChild(bar);
      }
    }

    _updateStoryBars(progress = 0){
      const bars = Array.from(this.$stories.children);
      bars.forEach((bar, i) => {
        const fill = bar.firstElementChild;
        if (i < this._current){
          bar.setAttribute('aria-current','past');
          fill.style.transform = 'scaleX(1)';
        } else if (i === this._current){
          bar.setAttribute('aria-current','active');
          fill.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
        } else {
          bar.removeAttribute('aria-current');
          fill.style.transform = 'scaleX(0)';
        }
      });
    }

    _show(index, jump = false) {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(index, this._slides.length - 1));
      this._current = clamped;
      this.$slidesContainer.style.transform = `translateX(-${this._current * 100}%)`;
      this._progress = 0;
      this._lastTick = 0;
      this._updateStoryBars(0);
      if (!jump) this._restartAutoplay();
      else this._restartAutoplay(true);
    }

    // --------- Stile "storie": autoplay + pause su pressione/hover ---------
    _tick = (ts) => {
      if (this._isPaused) { this._lastTick = ts; this._raf = requestAnimationFrame(this._tick); return; }
      if (!this._lastTick) this._lastTick = ts;
      const delta = ts - this._lastTick;
      this._lastTick = ts;
      this._progress += delta / this._duration;
      if (this._progress >= 1) {
        if (this._current < this._slides.length - 1) {
          this._show(this._current + 1, true);
        } else {
          // restart from first
          this._show(0, true);
        }
      } else {
        this._updateStoryBars(this._progress);
        this._raf = requestAnimationFrame(this._tick);
      }
    }

    _startAutoplay(){
      if (!this._autoplay) return;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(this._tick);
    }

    _stopAutoplay(){
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    _restartAutoplay(immediate = false){
      this._stopAutoplay();
      this._progress = 0;
      this._lastTick = 0;
      if (immediate) this._startAutoplay();
      else setTimeout(() => this._startAutoplay(), 0);
    }

    _pauseAutoplay(){ this._isPaused = true; }
    _resumeAutoplay(){ this._isPaused = false; }

    _syncAutoplayState(){
      if (this._autoplay) this._restartAutoplay(true);
      else this._stopAutoplay();
    }

    _bindStoryGestures(){
      // Tap/click zones
      const back = () => {
        if (this._progress > 0.1) { // se già iniziata, riparti da inizio slide
          this._progress = 0; this._updateStoryBars(0);
        } else {
          this._show(this._current - 1);
        }
      };
      const next = () => this._show(this._current + 1);

      this.$tapLeft.addEventListener('click', back);
      this.$tapRight.addEventListener('click', next);

      // Press & hold per mettere in pausa (mouse + touch)
      const onDown = () => this._pauseAutoplay();
      const onUp = () => this._resumeAutoplay();

      ['mousedown','touchstart','pointerdown'].forEach(ev => this.addEventListener(ev, onDown));
      ['mouseup','touchend','touchcancel','pointerup','pointercancel','mouseleave'].forEach(ev => this.addEventListener(ev, onUp));

      // tastiera
      this.setAttribute('tabindex','0');
      this.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') back();
        if (e.key === 'ArrowRight') next();
        if (e.key === ' '){ e.preventDefault(); this._isPaused ? this._resumeAutoplay() : this._pauseAutoplay(); }
      });
    }

    // --------- utilities ---------
    _fitRow(row){
      if (!row || row.hidden) return;
      row.style.setProperty('--tag-fs', '11px');
      const max = 11, min = 9;
      let fs = max, guard = 0;
      while (row.scrollWidth > row.clientWidth && fs > min && guard < 8) {
        fs -= 0.5;
        row.style.setProperty('--tag-fs', fs + 'px');
        guard++;
      }
      row.style.overflow = 'hidden';
    }

    _observeResize(){
      if (this._ro) this._ro.disconnect();
      this._ro = new ResizeObserver(() => {
        this._fitRow(this.$filters);
      });
      this._ro.observe(this);
    }
  }

  customElements.define('experience-card', ExperienceCard);
})();
