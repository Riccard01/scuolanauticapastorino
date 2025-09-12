class MapCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.lat = this.getAttribute('lat') || 44.409220;
    this.lng = this.getAttribute('lng') || 8.924081;
    this.zoom = this.getAttribute('zoom') || 14;
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display:flex; justify-content:center;
          width:90vw; max-width:920px;
        }
        .card {
          position:relative; flex:1;
          border-radius:16px; overflow:hidden;
          box-shadow:0 12px 30px rgba(0,0,0,.12);
        }
        iframe {
          display:block; width:100%; height:60vh; border:0;
        }
        .overlay {
          position:absolute; bottom:12px; left:50%;
          transform:translateX(-50%);
          width:calc(100% - 24px);
          display:flex; justify-content:center;
        }
        ds-button::part(button) {
          background:#000 !important;
          border-color:#000 !important;
          color:#fff !important;
        }
      </style>

      <div class="card">
        <iframe loading="lazy" allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
          title="Mappa posizione"></iframe>
        <div class="overlay">
          <ds-button id="goBtn" variant="solid-dark" size="lg" full>
            <span slot="text">Scopri Percorso</span>
          </ds-button>
        </div>
      </div>
    `;

    const iframe = this.shadowRoot.querySelector('iframe');
    iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(this.lat)},${encodeURIComponent(this.lng)}&z=${this.zoom}&output=embed`;

    this.shadowRoot.getElementById('goBtn')
      .addEventListener('ds-select', () => this._openRoute());
  }

  _openRoute() {
    const LAT = this.lat;
    const LNG = this.lng;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      window.location.href = `maps://?daddr=${LAT},${LNG}&dirflg=d`;
      return;
    }
    if (isAndroid) {
      window.location.href = `geo:0,0?q=${LAT},${LNG}(Destinazione)`;
      return;
    }
    const choice = window.prompt('Con quale app vuoi aprire il percorso? (google / apple)', 'google');
    if (choice && choice.toLowerCase().includes('apple')) {
      window.open(`https://maps.apple.com/?daddr=${LAT},${LNG}`, '_blank', 'noopener');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`, '_blank', 'noopener');
    }
  }
}

customElements.define('map-card', MapCard);
