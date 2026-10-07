// The lock screen controls: "またあしたね" for the child, and a sum on a keypad for the adult.

import { makeProblem, type Problem } from './playtime';

interface LockElements {
  screen: HTMLElement;
  adultButton: HTMLButtonElement;
  gate: HTMLElement;
  question: HTMLElement;
  answer: HTMLOutputElement;
  hint: HTMLElement;
  keys: HTMLElement;
  backButton: HTMLButtonElement;
}

const MAX_DIGITS = 2;

export function setupLockScreen(elements: LockElements, onUnlock: () => void): { show(): void; hide(): void } {
  const { screen, adultButton, gate, question, answer, hint, keys, backButton } = elements;
  let problem: Problem | undefined;
  let typed = '';

  function render(): void {
    answer.value = typed || '?';
  }

  function openGate(): void {
    problem = makeProblem(Math.random, problem);
    question.textContent = `${problem.a} × ${problem.b}`;
    typed = '';
    hint.textContent = '';
    render();
    adultButton.hidden = true;
    gate.hidden = false;
    keys.querySelector('button')?.focus();
  }

  function closeGate(): void {
    gate.hidden = true;
    adultButton.hidden = false;
    adultButton.focus();
  }

  function submit(): void {
    if (!problem || typed === '') return;
    if (Number(typed) === problem.answer) {
      onUnlock();
      return;
    }
    // No waiting and no new sum: just try again.
    typed = '';
    hint.textContent = 'ちがうよ。もういちど いれてね';
    render();
  }

  const layout: { label: string; action: () => void; kind?: string }[] = [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => ({ label: String(digit), action: () => press(String(digit)) })),
    { label: 'けす', kind: 'clear', action: () => ((typed = ''), render()) },
    { label: '0', action: () => press('0') },
    { label: 'けってい', kind: 'enter', action: submit },
  ];

  function press(digit: string): void {
    if (typed.length >= MAX_DIGITS) return;
    typed = typed === '0' ? digit : typed + digit;
    hint.textContent = '';
    render();
  }

  for (const key of layout) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = key.kind ? `gate__key gate__key--${key.kind}` : 'gate__key';
    button.textContent = key.label;
    button.addEventListener('click', key.action);
    keys.append(button);
  }

  adultButton.addEventListener('click', openGate);
  backButton.addEventListener('click', closeGate);

  return {
    show() {
      gate.hidden = true;
      adultButton.hidden = false;
      screen.hidden = false;
    },
    hide() {
      screen.hidden = true;
      gate.hidden = true;
    },
  };
}
