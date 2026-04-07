import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/react-query-persist-client'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours (persist across sessions)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'community-supplies-cache',
})

createRoot(document.getElementById("root")!).render(
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
  >
    <App />
  </PersistQueryClientProvider>
);
