class MyTitle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  static get observedAttributes() {
    return ['title', 'subtitle'];
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    const title = this.getAttribute('title') || 'Titolo di esempio';
    const subtitle = this.getAttribute('subtitle') || 'Questa è una descrizione di esempio.';

    this.shadowRoot.innerHTML = `
      <style>
        .wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: .5rem;
          margin: 1.5rem 0;
          width: 100%;
        }

        .title {
          font-size: 1.7rem;
          font-weight: 700;
          text-align: center;
          margin: 0;
          color: var(--my-title-color, #0f172a);
        }

        .subtitle {
          font-size: 1rem;
          max-width: 640px;
          text-align: center;
          margin: 0;
          color: var(--my-subtitle-color, #475569);
        }
      </style>

      <div class="wrapper">
        <h2 class="title">${title}</h2>
        <p class="subtitle">${subtitle}</p>
      </div>
    `;
  }
}

customElements.define('my-title', MyTitle);
