/**
 * Start screen overlay: seed input + "Войти" button.
 * Rendered as HTML over the canvas (in #ui-root).
 */
export class StartScreen {
  private container: HTMLDivElement;
  private input: HTMLInputElement;
  private button: HTMLButtonElement;
  private onStart: ((seedValue: string) => void) | null = null;

  constructor(uiRoot: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'start-screen';
    this.container.innerHTML = `
      <div class="start-inner">
        <h1 class="start-title">PANELLON</h1>
        <p class="start-subtitle">бесконечная гигахрущёвка</p>
        <div class="start-form">
          <input type="text" id="seed-input" placeholder="seed (по умолчанию: official)" autocomplete="off" spellcheck="false" />
          <button id="seed-enter">Войти</button>
        </div>
      </div>
    `;
    uiRoot.appendChild(this.container);

    this.input = this.container.querySelector('#seed-input')!;
    this.button = this.container.querySelector('#seed-enter')!;

    this.button.addEventListener('click', this.handleStart);
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleStart();
    });
  }

  show(cb: (seedValue: string) => void): void {
    this.onStart = cb;
    this.container.style.display = '';
    this.input.focus();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private handleStart = (): void => {
    this.onStart?.(this.input.value);
  };
}
