"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import jwtDecode from 'jwt-decode';

interface AuthContextType {
  token: string | null;
  user: { userId: number; role: string; nivelPermiso?: string } | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  isAssistant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ userId: number; role: string; nivelPermiso?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('jwtToken');
    if (storedToken) {
      try {
        const decodedUser = jwtDecode(storedToken) as { userId: number; role: string; nivelPermiso?: string; exp: number };
        if (decodedUser.exp * 1000 > Date.now()) { // Check if token is expired
          setToken(storedToken);
          setUser(decodedUser);
        } else {
          localStorage.removeItem('jwtToken');
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        localStorage.removeItem('jwtToken');
      }
    }
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('jwtToken', newToken);
    setToken(newToken);
    try {
      const decodedUser = jwtDecode(newToken) as { userId: number; role: string; nivelPermiso?: string };
      setUser(decodedUser);
    } catch (error) {
      console.error("Error decoding token on login:", error);
      setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('jwtToken');
    setToken(null);
    setUser(null);
    router.push('/login'); // Redirect to login page after logout
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = isAuthenticated && user?.role?.toUpperCase() === 'ADMINISTRADOR';
  const isOrganizer = isAuthenticated && user?.role?.toUpperCase() === 'ORGANIZADOR';
  const isAssistant = isAuthenticated && user?.role?.toUpperCase() === 'ASISTENTE';

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated, isAdmin, isOrganizer, isAssistant }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
