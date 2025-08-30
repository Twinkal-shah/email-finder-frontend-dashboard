import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/auth'
import cookieAuth from '../services/cookieAuth'

const AuthDebugger = () => {
  const { user, profile, isLoading, authError, profileError, isAuthenticated } = useAuth()
  const [debugInfo, setDebugInfo] = useState({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateDebugInfo = async () => {
      try {
        const cookieData = cookieAuth.getAuthCookie()
        const isAuth = await cookieAuth.isAuthenticated()
        const currentUser = await cookieAuth.getCurrentUser()
        
        setDebugInfo({
          timestamp: new Date().toLocaleTimeString(),
          hostname: window.location.hostname,
          cookies: document.cookie,
          hasCookie: !!cookieData,
          cookieData: cookieData ? {
            hasAccessToken: !!cookieData.access_token,
            hasRefreshToken: !!cookieData.refresh_token,
            expiresAt: cookieData.expires_at,
            userEmail: cookieData.user?.email
          } : null,
          isAuthenticatedResult: isAuth,
          currentUserResult: currentUser ? {
            id: currentUser.id,
            email: currentUser.email
          } : null
        })
      } catch (error) {
        setDebugInfo(prev => ({
          ...prev,
          error: error.message
        }))
      }
    }

    updateDebugInfo()
    const interval = setInterval(updateDebugInfo, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [user, isLoading])

  if (!isVisible) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          background: '#007bff',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}
        onClick={() => setIsVisible(true)}
      >
        🐛 Debug Auth
      </div>
    )
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '400px',
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 9999,
        background: 'white',
        border: '2px solid #007bff',
        borderRadius: '8px',
        padding: '15px',
        fontSize: '12px',
        fontFamily: 'monospace',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#007bff' }}>🐛 Auth Debugger</h3>
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>Auth Context State:</h4>
        <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
          <div>🔐 <strong>isAuthenticated:</strong> <span style={{ color: isAuthenticated ? 'green' : 'red' }}>{String(isAuthenticated)}</span></div>
          <div>⏳ <strong>isLoading:</strong> <span style={{ color: isLoading ? 'orange' : 'green' }}>{String(isLoading)}</span></div>
          <div>👤 <strong>user:</strong> {user ? `${user.email} (${user.id})` : 'null'}</div>
          <div>📋 <strong>profile:</strong> {profile ? `${profile.full_name || 'No name'} (${profile.credits_find}/${profile.credits_verify})` : 'null'}</div>
          <div>❌ <strong>authError:</strong> <span style={{ color: 'red' }}>{authError || 'none'}</span></div>
          <div>❌ <strong>profileError:</strong> <span style={{ color: 'red' }}>{profileError || 'none'}</span></div>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>Cookie Auth Debug:</h4>
        <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
          <div>🕐 <strong>Last Check:</strong> {debugInfo.timestamp}</div>
          <div>🌐 <strong>Hostname:</strong> {debugInfo.hostname}</div>
          <div>🍪 <strong>Has Cookie:</strong> <span style={{ color: debugInfo.hasCookie ? 'green' : 'red' }}>{String(debugInfo.hasCookie)}</span></div>
          {debugInfo.cookieData && (
            <div style={{ marginLeft: '10px' }}>
              <div>🔑 Access Token: <span style={{ color: debugInfo.cookieData.hasAccessToken ? 'green' : 'red' }}>{String(debugInfo.cookieData.hasAccessToken)}</span></div>
              <div>🔄 Refresh Token: <span style={{ color: debugInfo.cookieData.hasRefreshToken ? 'green' : 'red' }}>{String(debugInfo.cookieData.hasRefreshToken)}</span></div>
              <div>⏰ Expires: {debugInfo.cookieData.expiresAt ? new Date(debugInfo.cookieData.expiresAt * 1000).toLocaleString() : 'N/A'}</div>
              <div>📧 Email: {debugInfo.cookieData.userEmail || 'N/A'}</div>
            </div>
          )}
          <div>✅ <strong>isAuthenticated():</strong> <span style={{ color: debugInfo.isAuthenticatedResult ? 'green' : 'red' }}>{String(debugInfo.isAuthenticatedResult)}</span></div>
          <div>👤 <strong>getCurrentUser():</strong> {debugInfo.currentUserResult ? debugInfo.currentUserResult.email : 'null'}</div>
          {debugInfo.error && (
            <div style={{ color: 'red' }}>❌ <strong>Error:</strong> {debugInfo.error}</div>
          )}
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>Raw Cookies:</h4>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '8px', 
          borderRadius: '4px',
          wordBreak: 'break-all',
          fontSize: '10px',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          {debugInfo.cookies || 'No cookies'}
        </div>
      </div>

      <div style={{ marginTop: '15px', display: 'flex', gap: '5px' }}>
        <button 
          onClick={() => {
            cookieAuth.removeAuthCookie()
            localStorage.clear()
            window.location.reload()
          }}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          🗑️ Clear Auth
        </button>
        <button 
          onClick={() => window.location.reload()}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          🔄 Reload
        </button>
      </div>
    </div>
  )
}

export default AuthDebugger