import { isPreview } from './env';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <h1>はたらくくるま めいろ</h1>
  <p>じゅんびちゅう${isPreview ? '（プレビュー）' : ''}</p>
`;
