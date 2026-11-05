import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../ui/style.css';
import { Impostazioni } from './Impostazioni';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <Impostazioni />
  </StrictMode>,
);
