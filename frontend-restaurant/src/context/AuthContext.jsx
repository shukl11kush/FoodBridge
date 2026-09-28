import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authToken = token) => {
    if (!authToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      const res = await axios.get(`${API_URL}/auth/profile`);
      setUser(res.data);
      return res.data;
    } catch (err) {
      logout();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data.user_type !== 'RESTAURANT') {
        throw new Error('This portal is reserved for Restaurant accounts.');
      }
      const jwt = res.data.access_token;
      localStorage.setItem('token', jwt);
      setToken(jwt);
      await fetchProfile(jwt);
      return res.data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { ...data, user_type: 'RESTAURANT' });
      const jwt = res.data.access_token;
      localStorage.setItem('token', jwt);
      setToken(jwt);
      await fetchProfile(jwt);
      return res.data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken('');
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
