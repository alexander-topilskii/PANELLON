const FADE_DURATION = 300; // ms

/**
 * CSS overlay for fade-in/fade-out transitions between floors.
 */
export class FadeOverlay {
  private el: HTMLDivElement;

  constructor(uiRoot: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'fade-overlay';
    this.el.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:#000; opacity:0; pointer-events:none;
      transition: opacity ${FADE_DURATION}ms ease;
      z-index: 100;
    `;
    uiRoot.appendChild(this.el);
  }

  fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      this.el.style.opacity = '1';
      this.el.style.pointerEvents = 'auto';
      setTimeout(resolve, FADE_DURATION);
    });
  }

  fadeIn(): Promise<void> {
    return new Promise((resolve) => {
      this.el.style.opacity = '0';
      setTimeout(() => {
        this.el.style.pointerEvents = 'none';
        resolve();
      }, FADE_DURATION);
    });
  }
}
