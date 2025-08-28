import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth';
import { useRealTimeCredits } from '../hooks/useRealTimeCredits';
import { getUserProfile } from '../api/user';

const AuthDebugger = () => {
  const { user, isAuthenticated } = useAuth();
  const { credits, loading, error, refreshCredits } = useRealTimeCredits();
  const [profileData, setProfileData] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const gatherDebugInfo = () => {
      const storedUser = localStorage.getItem('auth_user');
      const storedTokens = localStorage.getItem('auth_tokens');
      const urlParams = new URLSearchParams(window.location.search);
      
      setDebugInfo({
        localStorage: {
          user: storedUser ? JSON.parse(storedUser) : null,
          tokens: storedTokens ? JSON.parse(storedTokens) : null
        },
        urlParams: {
          access_token: urlParams.get('access_token'),
          user_id: urlParams.get('user_id'),
          email: urlParams.get('email'),
          name: urlParams.get('name')
        },
        contextUser: user,
        isAuthenticated,
        credits,
        creditsLoading: loading,
        creditsError: error
      });
    };

    gatherDebugInfo();
    const interval = setInterval(gatherDebugInfo, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [user, isAuthenticated, credits, loading, error]);

  const testGetUserProfile = async () => {
    if (!user?.id) {
      setProfileError('No user ID available');
      return;
    }

    try {
      setProfileError(null);
      console.log('Testing getUserProfile with ID:', user.id);
      const profile = await getUserProfile(user.id);
      setProfileData(profile);
      console.log('Profile fetched successfully:', profile);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfileError(err.message);
    }
  };

  const testRefreshCredits = async () => {
    try {
      await refreshCredits();
      console.log('Credits refreshed successfully');
    } catch (err) {
      console.error('Error refreshing credits:', err);
    }
  };

  if (!window.location.search.includes('debug=true')) {
    return null; // Only show when debug=true is in URL
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '16px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#495057' }}>🔧 Auth Debugger</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>Authentication Status:</strong>
        <div style={{ color: isAuthenticated ? 'green' : 'red' }}>
          {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Context User:</strong>
        <pre style={{ margin: '4px 0', padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '10px' }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Credits State:</strong>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Error: {error || 'None'}</div>
        <div>Find Credits: {credits?.find || 'N/A'}</div>
        <div>Verify Credits: {credits?.verify || 'N/A'}</div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>LocalStorage User:</strong>
        <pre style={{ margin: '4px 0', padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '10px' }}>
          {JSON.stringify(debugInfo.localStorage?.user, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>URL Parameters:</strong>
        <pre style={{ margin: '4px 0', padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '10px' }}>
          {JSON.stringify(debugInfo.urlParams, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <button 
          onClick={testGetUserProfile}
          style={{
            padding: '4px 8px',
            marginRight: '8px',
            fontSize: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test getUserProfile
        </button>
        <button 
          onClick={testRefreshCredits}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Credits
        </button>
      </div>

      {profileData && (
        <div style={{ marginBottom: '12px' }}>
          <strong>Profile Data:</strong>
          <pre style={{ margin: '4px 0', padding: '8px', backgroundColor: '#d4edda', borderRadius: '4px', fontSize: '10px' }}>
            {JSON.stringify(profileData, null, 2)}
          </pre>
        </div>
      )}

      {profileError && (
        <div style={{ marginBottom: '12px' }}>
          <strong>Profile Error:</strong>
          <div style={{ color: 'red', fontSize: '10px' }}>{profileError}</div>
        </div>
      )}

      <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '12px' }}>
        💡 Add ?debug=true to URL to show this debugger
      </div>
    </div>
  );
};

export default AuthDebugger;