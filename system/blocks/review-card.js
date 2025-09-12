(() => {
  if (customElements.get('review-card')) return;

  class ReviewCard extends HTMLElement {
    static get observedAttributes() {
      return ['images','image','index','autoplay','duration','safe-bottom','title','description','tag','cta','price','slogan','type-speed','bubble-position','slogan-loop'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mounted = false;

      this._images = [];
      this._index = 0;
      this._autoplay = false;
      this._duration = 5000;
      this._progressRAF = null;
      this._startedAt = 0;
      this._activeFillPct = 0;
      this._safeBottom = 64;
      this._typeTimer = null;
      this._typedChars = 0;
      this._typingPaused = false;

      this._render();
    }

    connectedCallback() {
      this._readAll();
      this._mount();
      this._mounted = true;
      this._updateUI();
      this._startIfNeeded();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this._progressRAF);
      this._stopTyping();
    }

    attributeChangedCallback() {
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();
      this._startIfNeeded();
    }

    _readAll() {
      this._images = this._parseImages(this.getAttribute('images') || '');
      if (!this._images.length) {
        const single = this.getAttribute('image') || '';
        this._images = single ? [single] : [];
      }
      const i = parseInt(this.getAttribute('index') || '0', 10);
      this._index = Number.isFinite(i) ? Math.max(0, Math.min(i, this._images.length - 1)) : 0;
      this._autoplay = this.hasAttribute('autoplay');
      const d = parseInt(this.getAttribute('duration') || '5000', 10);
      this._duration = Number.isFinite(d) && d > 300 ? d : 5000;
      const sb = parseInt(this.getAttribute('safe-bottom') || '64', 10);
      this._safeBottom = Number.isFinite(sb) ? Math.max(0, sb) : 64;
      this._title = this.getAttribute('title') || 'Titolo esperienza';
      this._desc  = this.getAttribute('description') || 'Descrizione breve...';
      this._tag   = this.getAttribute('tag') || '';
      this._price = this.getAttribute('price') || '';
      this._slogan = this.getAttribute('slogan') || '';
      const spd = parseInt(this.getAttribute('type-speed') || '60', 10);
      this._typeSpeed = Number.isFinite(spd) && spd >= 10 ? spd : 60;
      this._bubblePos = (this.getAttribute('bubble-position') || 'tr').toLowerCase();
      if (!['tl','tr','bl','br'].includes(this._bubblePos)) this._bubblePos = 'tr';
      this._sloganLoop = this.hasAttribute('slogan-loop');
    }

    _parseImages(raw) {
      if (!raw) return [];
      try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p.filter(Boolean) : [];
      } catch {
        return raw.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{
            display:flex;
            flex:0 0 220px;
            width:200px;
            aspect-ratio:9/16;
            border-radius:16px;
            position:relative;
            transform:scale(var(--s,1));
            transition:transform .24s cubic-bezier(.2,.8,.2,1);
            background:#0b1220;
            color:#fff;
            font-family:system-ui,sans-serif;
            box-shadow:0 6px 14px rgba(0,0,0,.35);
            contain: layout paint;
            overflow:hidden;
          }

          :host::after{
            content:"";
            position:absolute;
            inset:0;
            border-radius:inherit;
            outline:1px solid rgba(255,255,255,.25);
            outline-offset:-1px;
            pointer-events:none;
            z-index:8;
          }

          .clip{
            position:absolute;
            inset:0;
            overflow:hidden;
            border-radius:inherit;
          }

          img.image {
            position:absolute;
            inset:0;
            margin:auto;
            max-width:70%;
            max-height:70%;
            object-fit:contain;
            display:block;
            z-index:0;
          }

          * {
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
          }

          .content{
            position:absolute;
            left:0;
            right:0;
            bottom:0;
            display:flex;
            flex-direction:column;
            gap:8px;
            padding:12px;
            z-index:5;
          }
          .tag{
            font-size:12px;
            font-weight:600;
            color:#e2e8f0;
            background:rgba(37,99,235,.18);
            border:1px solid rgba(255,235,221,.45);
            padding:2px 8px;
            border-radius:999px;
            width:fit-content;
          }
          h3{ font-size:18px; margin:0; font-weight:700; line-height:1.2; }
          p{ font-size:14px; margin:0; color:#d1d5db; }
        </style>

        <div class="clip">
          <img class="image" alt="">
          <div class="content">
            <span class="tag" part="tag" style="display:none;"></span>
            <h3 part="title"></h3>
            <p part="description"></p>
          </div>
        </div>
      `;
    }

    _mount() {
      const sr = this.shadowRoot;
      this.$img = sr.querySelector('img.image');
      this.$tag = sr.querySelector('.tag');
      this.$title = sr.querySelector('h3');
      this.$desc = sr.querySelector('p');
    }

    _updateUI() {
      if (!this.$img || !this.$title || !this.$desc || !this.$tag) return;

      const url = this._images[this._index] || '';
      if (url) {
        this.$img.src = url;
        this.$img.alt = this._title || '';
      }

      if (this._tag && String(this._tag).trim()) {
        this.$tag.style.display='inline-block';
        this.$tag.textContent=this._tag;
      } else {
        this.$tag.style.display='none';
      }

      this.$title.textContent = this._title;
      this.$desc.textContent = this._desc;
    }

    _startIfNeeded() {
      // autoplay rimosso perché non serve alle immagini statiche
    }

    _stopTyping() {}
  }

  customElements.define('review-card', ReviewCard);
})();
