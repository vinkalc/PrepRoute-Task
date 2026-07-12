import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './routes/AppRoutes'
import { Toaster } from 'react-hot-toast'

// Initialize TanStack Query Client for global caching and fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes caching
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
