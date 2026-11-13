import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient.js'
import './index.css'
import App from './App.jsx'
import { wakeServer } from './api/http.js'

// Wake backend server immediately on initial bundle evaluation
wakeServer();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
