/**
 * Minimal HUD showing current floor number.
 */
export class HUD {
  private el: HTMLDivElement;

  constructor(uiRoot: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'hud';
    uiRoot.appendChild(this.el);
  }

  setFloor(n: number): void {
    this.el.textContent = `Этаж ${n}`;
  }

  show(): void {
    this.el.style.display = '';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
