import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';
import './profile-motion.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error(
    'Root element #root not found. Check index.html.',
  );
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);