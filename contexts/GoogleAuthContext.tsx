import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { GoogleUser } from '../types';

declare global {
    interface Window {
        gapi: any;
        google: any;
        tokenClient: any;
    }
}

interface GoogleAuthContextType {
  isAuthenticated: boolean;
  user: GoogleUser | null;
  accessToken: string | null;
  signIn: () => void;
  signOut: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

// IMPORTANT: Replace this with your actual Google Client ID from the Google Cloud Console.
const GOOGLE_CLIENT_ID = "12345-placeholder.apps.googleusercontent.com";
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const GoogleAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Scripts are loaded via index.html, we just need to wait for them
    const checkGoogleLoaded = setInterval(() => {
      if (window.gapi && window.google) {
        clearInterval(checkGoogleLoaded);
        initializeGis();
      }
    }, 100);

    return () => clearInterval(checkGoogleLoaded);
  }, []);

  const initializeGis = () => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith("YOUR_")) {
      console.error("Google Client ID is not configured. Please replace the placeholder in contexts/GoogleAuthContext.tsx.");
      return;
    }

    window.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          console.error('Google Auth Error:', tokenResponse.error);
          return;
        }
        if (tokenResponse.access_token) {
          setAccessToken(tokenResponse.access_token);
          fetchUserProfile(tokenResponse.access_token);
          setIsAuthenticated(true);
        }
      },
    });

    // Check if a token exists in session storage to persist login
    const storedToken = sessionStorage.getItem('google_access_token');
    if (storedToken) {
        setAccessToken(storedToken);
        setIsAuthenticated(true);
        fetchUserProfile(storedToken);
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch user info');
      const profile: GoogleUser = await response.json();
      setUser(profile);
      sessionStorage.setItem('google_access_token', token); // Persist token
    } catch (error) {
      console.error('Error fetching user profile:', error);
      signOut(); // Sign out if token is invalid
    }
  };

  const signIn = () => {
    if (window.tokenClient) {
      window.tokenClient.requestAccessToken();
    } else {
      console.error('Google Token Client not initialized.');
    }
  };

  const signOut = () => {
    const storedToken = accessToken || sessionStorage.getItem('google_access_token');
    if (storedToken) {
        window.google?.accounts.oauth2.revoke(storedToken, () => {});
    }
    setIsAuthenticated(false);
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem('google_access_token');
  };

  const value = { isAuthenticated, user, accessToken, signIn, signOut };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = (): GoogleAuthContextType => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};