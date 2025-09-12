(() => {
  if (customElements.get('experience-card')) return;

  class ExperienceCard extends HTMLElement {
    static get observedAttributes() {
      return ['title','description','price','time','filters','tag','images'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mounted = false;
      this._current = 0;
      this._slides = [];
      this._render();
    }

    connectedCallback() {
      this._readAll();
      this._mount();
      this._mounted = true;
      this._updateUI();
      this._observeResize();
      this._initCarousel();
    }

    disconnectedCallback() {
      if (this._ro) this._ro.disconnect();
    }

    attributeChangedCallback(name, _oldValue, _newValue) {
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();

      // Se cambia l'array immagini, rigeneriamo gli slide
      if (name === 'images') {
        this._applyImages();
        const slot = this.shadowRoot.querySelector('slot');
        this._slides = slot.assignedElements({ flatten:true });
        this._renderDots();
        this._show(0);
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

      // NUOVO: immagini locali (lista di path separati da virgola)
      const imgs = (this.getAttribute('images') || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      this._images = imgs;
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
          }

          @media (hover: hover) and (pointer: fine){
            :host(:hover){ transform: scale(1.07); }
          }
          @media (hover: none) and (pointer: coarse){
            :host([data-active]){ transform: scale(1.08); }
          }

          /* Glow / ombra interna */
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

          /* Outline */
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

          /* frecce minimali */
          .controls{ position:absolute; top:50%; left:0; right:0; display:flex; justify-content:space-between;
                     transform:translateY(-50%); z-index:4; pointer-events:none; }
          .btn{
            background:rgba(0,0,0,.32);
            border:1px solid rgba(255,255,255,.35);
            color:#fff; font-size:18px;
            width:32px; height:32px; border-radius:50%;
            cursor:pointer; pointer-events:auto;
            display:flex; align-items:center; justify-content:center;
            transition:background .2s ease, opacity .2s ease, border-color .2s ease;
          }
          .btn:hover:not([disabled]){ background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.55); }
          .btn[disabled]{ opacity:.35; cursor:default; }

          /* overlay + feather (ombra interna) */
          .overlay{ position:absolute; inset:0; pointer-events:none; z-index:2;
            background:linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.35) 35%,rgba(0,0,0,.10) 60%,rgba(0,0,0,0) 85%); }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%;
            backdrop-filter:blur(14px) saturate(110%); -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12); mask-image:linear-gradient(to top,black 60%,transparent 100%);
            -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%); z-index:2; pointer-events:none; }

          .content{ position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:column; gap:6px; padding:12px; z-index:5; }

          /* --- Dots (stessa logica dell'experiences-gallery) --- */
          .dots{
            display:flex; justify-content:center; gap:8px;
            pointer-events:none; margin-bottom:6px;
          }
          .dot{
            inline-size: 6px; block-size: 6px; border-radius: 999px;
            background: rgba(255,255,255,.45);
            transform: scale(1);
            transition: transform .18s ease, background-color .18s ease, opacity .18s;
            opacity: .95;
          }
          .dot[aria-current="true"]{
            background:#ffffff;
            transform: scale(1.25);
          }

          /* TAG + meta + testi */
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
            <div class="controls">
              <button class="btn" id="prev" aria-label="Immagine precedente">‹</button>
              <button class="btn" id="next" aria-label="Immagine successiva">›</button>
            </div>
          </div>

          <div class="overlay"></div>
          <div class="feather"></div>

          <div class="content">
            <!-- Dots prima di tag/titolo -->
            <div class="dots" id="dots" aria-hidden="true"></div>

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
      this.$dots = this.shadowRoot.getElementById('dots');
      this.$prev = this.shadowRoot.getElementById('prev');
      this.$next = this.shadowRoot.getElementById('next');
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
      // rimosso: this._fitRow(this.$meta); // non esiste $meta
    }

    // --------- carosello ---------
    _applyImages() {
      if (!this._images || this._images.length === 0) return;

      // Rimuovi <img> generati in precedenza da noi
      Array.from(this.querySelectorAll('img[slot="slide"][data-generated="true"]')).forEach(el => el.remove());

      // Se lo slot è già popolato manualmente, non tocchiamo nulla
      const already = this.querySelector('img[slot="slide"]');
      if (already) return;

      // Genera gli slide dalle immagini locali
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
      // Applica prima le immagini locali se fornite
      this._applyImages();

      const slot = this.shadowRoot.querySelector('slot');
      this._slides = slot.assignedElements({ flatten:true });

      // Placeholder se ancora vuoto
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

      this.$prev.addEventListener('click', () => this._show(this._current - 1));
      this.$next.addEventListener('click', () => this._show(this._current + 1));

      // Reagisce a cambi slot (es. se cambi images a runtime)
      slot.addEventListener('slotchange', () => {
        this._slides = slot.assignedElements({ flatten:true });
        this._renderDots();
        this._show(0);
      });

      this._renderDots();
      this._show(0);
    }

    _renderDots(){
      this.$dots.innerHTML = '';
      for (let i=0;i<this._slides.length;i++){
        const d = document.createElement('i');
        d.className = 'dot';
        if (i === this._current) d.setAttribute('aria-current','true');
        this.$dots.appendChild(d);
      }
    }

    _show(index) {
      if (!this._slides.length) return;
      this._current = Math.max(0, Math.min(index, this._slides.length - 1));
      this.$slidesContainer.style.transform = `translateX(-${this._current * 100}%)`;
      this._updateControls();
      this._updateDots();
    }

    _updateControls(){
      this.$prev.disabled = this._current === 0;
      this.$next.disabled = this._current === this._slides.length - 1;
    }

    _updateDots(){
      const dots = Array.from(this.$dots.children);
      dots.forEach((el, i) => {
        if (i === this._current) el.setAttribute('aria-current','true');
        else el.removeAttribute('aria-current');
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
