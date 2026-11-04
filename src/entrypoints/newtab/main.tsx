import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../ui/style.css';
import { Tana } from './Tana';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <Tana />
  </StrictMode>,
);
