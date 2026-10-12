import { setBaseUrl } from "@workspace/api-client-react";
import { installDemo } from "./lib/demo";
import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

setBaseUrl(import.meta.env.VITE_API_URL || null);
if (import.meta.env.VITE_DEMO_MODE === "true") installDemo();

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
