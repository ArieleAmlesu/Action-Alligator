import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../ui/style.css';
import { Popup } from './Popup';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
