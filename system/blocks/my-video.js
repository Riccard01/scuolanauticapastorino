
class MyVideo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  _render() {
    const videoSrc = this.getAttribute('src') || '';
    const title    = this.getAttribute('title') || 'Titolo di esempio';
    const subtitle = this.getAttribute('subtitle') || 'Sottotitolo di esempio';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        .container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          overflow: hidden;
        }

        video {
          width: 100%;
          height: auto;
          max-height: 500px;
          object-fit: cover;
        }

        .overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 1rem;
          background: rgba(0,0,0,0.25); /* leggero scuro */
        }

        /* Mobile: video 9/16, larghezza piena, altezza auto */
        @media (max-width: 768px) {
          video {
            width: 100%;
            height: auto;
            max-height: none;
          }
        }

        /* Desktop: fisso 500px di altezza */
        @media (min-width: 769px) {
          video {
            height: 500px;
            width: auto;
            min-width: 100%;
          }
        }

        /* Stili titoli invertiti */
        ::slotted(my-title) .title {
          color: white !important;
        }
        ::slotted(my-title) .subtitle {
          color: white !important;
        }

        .cta {
          margin-top: 1rem;
        }
      </style>

      <div class="container">
        <video autoplay muted loop playsinline>
          <source src="${videoSrc}" type="video/mp4">
        </video>

        <div class="overlay">
          <slot name="title">
            <my-title title="${title}" subtitle="${subtitle}"></my-title>
          </slot>
          <div class="cta">
            <ds-button variant="overlay" size="lg" id="cta-btn">
              <span slot="text">Scopri il programma</span>
            </ds-button>
          </div>
        </div>
      </div>
    `;

    this._attachEvents();
  }

  _attachEvents() {
    const btn = this.shadowRoot.querySelector('#cta-btn');
    if (btn) {
      btn.addEventListener('ds-select', () => {
        const target = document.querySelector('#la-nostra-flotta');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }
}

customElements.define('my-video', MyVideo);

