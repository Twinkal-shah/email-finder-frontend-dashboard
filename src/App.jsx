import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchPage from './pages/SearchPage.jsx'
import VerifyPage from './pages/VerifyPage.jsx'
import BulkSearchPage from './pages/BulkSearchPage.jsx'
import { FindResultsProvider } from './contexts/findResults.jsx'

const queryClient = new QueryClient()

function SectionLabel({ children }) {
  return <div className="px-3 text-[11px] font-semibold tracking-wide text-gray-400 mt-6 mb-2">{children}</div>
}

function SidebarItem({ to, label }) {
  const base = 'flex items-center gap-2 px-3 py-2 rounded-md text-sm';
  return (
    <NavLink to={to} className={({isActive}) => `${base} ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
      <span className="w-4 h-4 rounded-full bg-gray-300" />
      <span>{label}</span>
    </NavLink>
  )
}

function Sidebar() {
  return (
    <aside className="w-72 border-r border-gray-200 p-4 flex flex-col justify-between min-h-[calc(100vh-3.5rem)]">
      <div>
        <div className="px-3 py-2 text-lg font-semibold flex items-center gap-2">
          <span className="inline-flex w-5 h-5 bg-gray-900 rounded-sm" />
          <span>Email finder</span>
        </div>

        <SectionLabel>EMAIL TOOLS</SectionLabel>
        <nav className="flex flex-col gap-1">
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

      <div className="space-y-3 px-2">
        <button className="w-full px-3 py-2 rounded-md bg-blue-600 text-white text-sm">Add Credits</button>
        <button className="w-full px-3 py-2 rounded-md border text-sm">Login</button>
      </div>
    </aside>
  )
}

function Topbar() {
  return (
    <header className="h-14 border-b border-gray-200 px-4 flex items-center justify-between bg-white">
      <div className="font-semibold">Email Finder Dashboard</div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>Credits: 0</span>
        <button className="px-3 py-1.5 rounded-md bg-gray-900 text-white">Login</button>
      </div>
    </header>
  )
}

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/search" element={<SearchPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/bulk-search" element={<BulkSearchPage />} />
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="*" element={<div className="p-6">Not Found</div>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FindResultsProvider>
          <Layout />
        </FindResultsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
