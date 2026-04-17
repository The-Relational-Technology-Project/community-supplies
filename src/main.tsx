import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
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
  deserialize: (cachedString) => {
    try {
      return JSON.parse(cachedString);
    } catch {
      return { clientState: undefined };
    }
  },
})

createRoot(document.getElementById("root")!).render(
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      buster: 'v5',
      dehydrateOptions: {
        shouldDehydrateQuery: (query) =>
          query.state.status === 'success' &&
          (Array.isArray(query.state.data) ? query.state.data.length > 0 : true),
      },
    }}
  >
    <App />
  </PersistQueryClientProvider>
);
