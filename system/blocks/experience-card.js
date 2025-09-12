(() => {
  if (customElements.get('experience-card')) return;

  class ExperienceCard extends HTMLElement {
    static get observedAttributes() {
      return ['title','description','price','time','filters','tag'];
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

    attributeChangedCallback() {
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();
    }

    _readAll() {
      this._title = this.getAttribute('title') || 'Titolo esperienza';
      this._desc  = this.getAttribute('description') || 'Descrizione breve...';

      this._price = this.getAttribute('price') || 'Prezzo su richiesta';
      this._time  = this.getAttribute('time')  || '6 persone';

      const raw = this.getAttribute('filters') || this.getAttribute('tag') || '';
      this._filters = raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 4);
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{
            --glow-dur:.30s;
            --glow-rgb:0,160,255;
            inline-size: var(--card-w, 280px);
            display:flex; border-radius:16px;
            position:relative; overflow:hidden;
            background:#0b1220; color:#fff;
            font-family:system-ui,sans-serif;
            box-shadow:0 10px 30px rgba(0,0,0,.35);
            aspect-ratio: 16 / 9;
            height: 450px;
          }

          /* Effetti glow */
          :host::before{
            content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
            z-index:3; opacity:0; transform:scale(1);
            background: radial-gradient(82% 72% at 50% 106%, rgba(var(--glow-rgb),.34) 0%, rgba(var(--glow-rgb),.16) 40%, rgba(0,0,0,0) 70%);
            box-shadow: 0 28px 56px -16px rgba(var(--glow-rgb), .55),
                        0 0 0 1.5px rgba(var(--glow-rgb), .40),
                        inset 0 -14px 28px rgba(var(--glow-rgb), .28);
            transition: opacity var(--glow-dur);
          }
          :host([data-active])::before{
            opacity:1;
          }
          :host::after{
            content:""; position:absolute; inset:0; border-radius:inherit;
            outline:2px solid rgba(255,255,255,.3);
            outline-offset:-2px; mix-blend-mode:overlay; pointer-events:none; z-index:6;
          }

          .clip{ position:absolute; inset:0; overflow:hidden; border-radius:inherit; }

          /* --- carosello immagini --- */
          .carousel{
            position:absolute; inset:0; overflow:hidden; z-index:0;
          }
          .slides{
            display:flex;
            width:100%; height:100%;
            transition: transform .45s ease;
          }
          ::slotted(img[slot="slide"]){
            flex:0 0 100%;
            width:100%; height:100%;
            object-fit:cover;
          }
          .controls{
            position:absolute; top:50%; left:0; right:0;
            display:flex; justify-content:space-between;
            transform:translateY(-50%);
            z-index:4;
            pointer-events:none;
          }
          .btn{
            background:rgba(0,0,0,.45);
            border:none; color:#fff;
            width:32px; height:32px; border-radius:50%;
            cursor:pointer; pointer-events:auto;
          }

          /* overlay + feather */
          .overlay{ position:absolute; inset:0; pointer-events:none; z-index:2;
            background:linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.35) 35%,rgba(0,0,0,.10) 60%,rgba(0,0,0,0) 85%);
          }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%;
            backdrop-filter:blur(14px) saturate(110%);
            -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12);
            mask-image:linear-gradient(to top,black 60%,transparent 100%);
            -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%);
            z-index:2; pointer-events:none; }

          .content{
            position:absolute; left:0; right:0; bottom:0;
            display:flex; flex-direction:column; gap:6px;
            padding:12px; z-index:5;
          }
          .filters, .meta{
            display:flex; gap:6px; flex-wrap:nowrap; overflow:hidden;
            margin:0; padding:0; --tag-fs: 11px;
          }
          .chip, .pill{
            font-size: var(--tag-fs); font-weight:700;
            line-height:1; white-space:nowrap;
            padding:6px 8px; border-radius:999px;
            border:1px solid rgba(16,185,129,.45);
            background:rgba(16,185,129,.15); color:#d1fae5;
          }
          h3{ font-size:18px; margin:0; font-weight:700; line-height:1.18; }
          p{ font-size:14px; margin:0; color:#d1d5db; }
        </style>

        <div class="clip">
          <div class="carousel">
            <div class="slides"><slot name="slide"></slot></div>
            <div class="controls">
              <button class="btn" id="prev">‹</button>
              <button class="btn" id="next">›</button>
            </div>
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
        </div>
      `;
    }

    _mount() {
      this.$title = this.shadowRoot.querySelector('h3');
      this.$desc  = this.shadowRoot.querySelector('p');
      this.$filters = this.shadowRoot.querySelector('.filters');
      this.$pillPrice = this.shadowRoot.querySelector('.pill-price');
      this.$pillTime  = this.shadowRoot.querySelector('.pill-time');
    }

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
    }

    _initCarousel() {
      const slot = this.shadowRoot.querySelector('slot');
      this._slides = slot.assignedElements({ flatten:true });

      // se non ci sono immagini → placeholder
      if (this._slides.length === 0) {
        for (let i=0;i<2;i++) {
          const img = document.createElement('img');
          img.slot = 'slide';
          img.src = `https://picsum.photos/600/400?random=${Math.random()}`;
          this.appendChild(img);
        }
        this._slides = slot.assignedElements({ flatten:true });
      }

      this._show(0);

      this.shadowRoot.getElementById('prev')
        .addEventListener('click', () => this._show(this._current - 1));
      this.shadowRoot.getElementById('next')
        .addEventListener('click', () => this._show(this._current + 1));
    }

    _show(index) {
      if (!this._slides.length) return;
      this._current = (index + this._slides.length) % this._slides.length;
      const slidesEl = this.shadowRoot.querySelector('.slides');
      slidesEl.style.transform = `translateX(-${this._current * 100}%)`;
    }

    _observeResize(){
      if (this._ro) this._ro.disconnect();
      this._ro = new ResizeObserver(() => {
        // eventuali fix responsive
      });
      this._ro.observe(this);
    }
  }

  customElements.define('experience-card', ExperienceCard);
})();
