/**
 * Debug overlay that shows the current room's SDF shader source.
 * Toggle with 'I' key.
 */
export class ShaderDebug {
  private el: HTMLDivElement;
  private pre: HTMLPreElement;
  private visible = false;
  private currentCode = '';

  constructor(uiRoot: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'shader-debug';
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.88)',
      zIndex: '50',
      display: 'none',
      overflow: 'auto',
      padding: '1.5rem',
      pointerEvents: 'auto',
    } as CSSStyleDeclaration);

    const header = document.createElement('div');
    Object.assign(header.style, {
      color: '#8ab4f8',
      fontFamily: 'monospace',
      fontSize: '0.8rem',
      marginBottom: '0.5rem',
    } as CSSStyleDeclaration);
    header.textContent = 'Room SDF shader (press I to close)';
    this.el.appendChild(header);

    this.pre = document.createElement('pre');
    Object.assign(this.pre.style, {
      color: '#c8c8b0',
      fontFamily: "'Courier New', monospace",
      fontSize: '0.72rem',
      lineHeight: '1.3',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      margin: '0',
    } as CSSStyleDeclaration);
    this.el.appendChild(this.pre);

    uiRoot.appendChild(this.el);
    window.addEventListener('keydown', this.onKey);
  }

  setCode(code: string): void {
    this.currentCode = code;
    if (this.visible) this.pre.textContent = code;
  }

  clear(): void {
    this.currentCode = '';
    if (this.visible) this.pre.textContent = '(no shader active)';
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    this.el.remove();
  }

  private toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? '' : 'none';
    if (this.visible) {
      this.pre.textContent = this.currentCode || '(no shader active)';
    }
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'KeyI') this.toggle();
  };
}
