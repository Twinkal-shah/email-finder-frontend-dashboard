import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchPage from './pages/SearchPage.jsx'
import VerifyPage from './pages/VerifyPage.jsx'
import BulkSearchPage from './pages/BulkSearchPage.jsx'
import { FindResultsProvider } from './contexts/findResults.jsx'
import { AuthProvider, useAuth } from './contexts/auth.jsx'

const queryClient = new QueryClient()

function SectionLabel({ children }) {
  return <div className="px-3 text-[11px] font-semibold tracking-wide text-gray-400 mt-6 mb-2">{children}</div>
}

function SidebarItem({ to, label }) {
  const base = 'flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap';
  return (
    <NavLink to={to} className={({isActive}) => `${base} ${isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
      <span className="w-4 h-4 rounded-full bg-muted" />
      <span>{label}</span>
    </NavLink>
  )
}

function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }



  return (
    <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card p-4 flex flex-col justify-between min-h-auto lg:min-h-[calc(100vh-3.5rem)]">
      <div>
        <div className="px-3 py-2 text-lg font-semibold flex items-center gap-2">
          <span className="inline-flex w-5 h-5 bg-foreground rounded-sm" />
          <span>Email finder</span>
        </div>

        <SectionLabel>EMAIL TOOLS</SectionLabel>
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          <SidebarItem to="/search" label="Find" />
          <SidebarItem to="/bulk-search" label="Bulk finder" />
          <SidebarItem to="/verify" label="Verify" />
        </nav>

        {/* <SectionLabel>LEAD TOOLS</SectionLabel>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400">
            <span className="w-4 h-4 rounded-full bg-gray-200" />
            <span>Map Extractor <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-gray-100">BETA</span></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400">
            <span className="w-4 h-4 rounded-full bg-gray-200" />
            <span>Browser Extension</span>
          </div>
        </div> */}

        {/* <SectionLabel>AUTOMATION</SectionLabel>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400">
            <span className="w-4 h-4 rounded-full bg-gray-200" />
            <span>API</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400">
            <span className="w-4 h-4 rounded-full bg-gray-200" />
            <span>Integrations</span>
          </div>
        </div> */}
      </div>

      <div className="space-y-3 px-2 mt-4 lg:mt-0">
        <button className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm">Add Credits</button>
        {isAuthenticated ? (
          <div className="space-y-2">
            <div className="w-full px-3 py-2 rounded-md bg-muted text-muted-foreground text-sm text-center">
              {user.name}
            </div>
            <button 
              onClick={handleLogout}
              className="w-full px-3 py-2 rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function Topbar() {
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }



  return (
    <header className="h-14 border-b border-border px-4 flex items-center justify-between bg-card">
      <div className="font-semibold text-foreground">Email Finder Dashboard</div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="hidden sm:inline">Credits: 0</span>
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{user?.name || 'Unknown User'}</span>
            <button 
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <Routes>
                <Route path="/search" element={<SearchPage />} />
                <Route path="/verify" element={<VerifyPage />} />
                <Route path="/bulk-search" element={<BulkSearchPage />} />
                <Route path="/" element={<Navigate to="/search" replace />} />
                <Route path="*" element={<div className="p-6 text-center">Not Found</div>} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <FindResultsProvider>
            <Layout />
          </FindResultsProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
