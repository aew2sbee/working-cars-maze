import './style.css';
import { isPreview } from './env';
import { startGame } from './game';

// Keep pinch-zoom and long-press menus from interrupting play on iOS Safari.
document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('contextmenu', (event) => event.preventDefault());

if (isPreview) {
  const badge = document.createElement('div');
  badge.className = 'preview-badge';
  badge.textContent = 'ぷれびゅー';
  document.body.append(badge);
}

startGame({
  canvas: document.querySelector<HTMLCanvasElement>('#stage')!,
  selectScreen: document.querySelector<HTMLElement>('#select')!,
  vehicleList: document.querySelector<HTMLElement>('#vehicles')!,
  overlay: document.querySelector<HTMLElement>('#clear')!,
  againButton: document.querySelector<HTMLButtonElement>('#again')!,
  changeButton: document.querySelector<HTMLButtonElement>('#change')!,
  sleepButton: document.querySelector<HTMLButtonElement>('#sleep')!,
  safeArea: document.querySelector<HTMLElement>('.safe-area')!,
  lock: {
    screen: document.querySelector<HTMLElement>('#lock')!,
    adultButton: document.querySelector<HTMLButtonElement>('#adult')!,
    gate: document.querySelector<HTMLElement>('#gate')!,
    question: document.querySelector<HTMLElement>('#gate-question')!,
    answer: document.querySelector<HTMLOutputElement>('#gate-answer')!,
    hint: document.querySelector<HTMLElement>('#gate-hint')!,
    keys: document.querySelector<HTMLElement>('#gate-keys')!,
    backButton: document.querySelector<HTMLButtonElement>('#gate-back')!,
  },
});
