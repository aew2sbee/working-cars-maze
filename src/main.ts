import './style.css';
import { isPreview } from './env';
import { startGame } from './game';

// Keep pinch-zoom and long-press menus from interrupting play on iOS Safari.
document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('contextmenu', (event) => event.preventDefault());

if (isPreview) {
  const badge = document.createElement('div');
  badge.className = 'preview-badge';
  badge.textContent = 'プレビュー';
  document.body.append(badge);
}

startGame({
  canvas: document.querySelector<HTMLCanvasElement>('#stage')!,
  overlay: document.querySelector<HTMLElement>('#clear')!,
  againButton: document.querySelector<HTMLButtonElement>('#again')!,
  safeArea: document.querySelector<HTMLElement>('.safe-area')!,
});
