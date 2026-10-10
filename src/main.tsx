import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { startCloudSync } from './services/cloudSync';

startCloudSync();

// 開発時のみ：ブラウザのコンソールから状態を確認できるようにする
if (import.meta.env.DEV) {
  import('./store/appStore').then(({ useApp }) => import('./store/uiStore').then(({ useUi }) => Object.assign(window, { __app: useApp, __ui: useUi })));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
