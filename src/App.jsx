import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchPage from './pages/SearchPage.jsx'
import VerifyPage from './pages/VerifyPage.jsx'
import BulkSearchPage from './pages/BulkSearchPage.jsx'
import BillingPage from './pages/BillingPage.jsx'
import AuthDiagnostics from './pages/AuthDiagnostics.jsx'
import { FindResultsProvider } from './contexts/findResults.jsx'
import { AuthProvider, useAuth } from './contexts/auth.jsx'
import { useRealTimeCredits } from './hooks/useRealTimeCredits.js'
import DebugCredits from './components/DebugCredits.jsx'
import TestCredits from './components/TestCredits.jsx'
import { useState, useEffect } from 'react'

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

        <SectionLabel>ACCOUNT</SectionLabel>
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          <SidebarItem to="/billing" label="Credits & Billing" />
        </nav>

        <SectionLabel>DIAGNOSTICS</SectionLabel>
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          <SidebarItem to="/diagnostics" label="Auth Diagnostics" />
        </nav>
      </div>

      {isAuthenticated && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="px-3 py-2 text-sm text-muted-foreground mb-2">
            {user?.name || 'User'}
          </div>
          <button 
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-left rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </aside>
  )
}

function Topbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { creditData, refetch } = useRealTimeCredits(user)
  const { find, verify, loading } = creditData
  
  const handleLogout = () => {
    logout()
  }

  const emailLocal = user?.email?.split('@')[0] || 'User'
  const displayName = emailLocal // Simplified for now
  const formatPlan = () => 'Free' // Default plan for now

  return (
    <header className="h-14 border-b border-border px-4 flex items-center justify-between bg-card">
      <div className="font-semibold text-foreground">Email Finder Dashboard</div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {isAuthenticated && (
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-green-600 font-medium">
              Find: {find?.toLocaleString() || '0'}
            </span>
            <span className="text-blue-600 font-medium">
              Verify: {verify?.toLocaleString() || '0'}
            </span>
            <span className="text-purple-600 font-medium capitalize">
              {formatPlan()}
            </span>
            {loading && (
              <span className="text-xs text-yellow-600">Loading...</span>
            )}

          </div>
        )}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">
              {loading ? 'Loading...' : displayName}
            </span>
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

// Authentication Guard Component
function AuthGuard({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    )
  }

  // Check for user existence instead of just isAuthenticated flag
  if (!user || !user.id) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
            <p className="text-muted-foreground">Please log in through mailsfinder.com to access the dashboard.</p>
          </div>
          <a 
            href={`https://www.mailsfinder.com/login.html?return_url=${encodeURIComponent(window.location.origin)}`}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return children
}

function Layout() {
  return (
    <AuthGuard>
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
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/diagnostics" element={<AuthDiagnostics />} />
                  <Route path="/" element={<Navigate to="/search" replace />} />
                  <Route path="*" element={<div className="p-6 text-center">Not Found</div>} />
                </Routes>
              </div>
            </div>
          </main>
        </div>
        <DebugCredits />
        <TestCredits />
      </div>
    </AuthGuard>
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
