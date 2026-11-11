import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { RouterProvider } from './router.jsx';
import { SesionProvider } from './context/Sesion.jsx';
import { AvisosProvider } from './context/Avisos.jsx';
import './styles/utils.css';
import './styles/main.css';
import './styles/transiciones.css';
import './styles/chatbot.css';
import './styles/tema.css';
import './styles/tema-oscuro.css';
import { aplicarTemaGuardado } from './hooks/useTema.js';

aplicarTemaGuardado();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider>
      <AvisosProvider>
        <SesionProvider>
          <App />
        </SesionProvider>
      </AvisosProvider>
    </RouterProvider>
  </StrictMode>,
);
