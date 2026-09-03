import { create } from 'zustand';
import { clearSession, post, put, setSession } from '../services/api';

function storedUser() {
  try { return JSON.parse(localStorage.getItem('commerce_user') || 'null'); } catch { return null; }
}

export const useAuth = create((set) => ({
  user: storedUser(),
  loading: false,
  error: '',
  async login(email, password) {
    set({ loading: true, error: '' });
    try {
      const data = await post('/auth/login', { email, password });
      setSession(data); set({ user: data.user, loading: false }); return data.user;
    } catch (error) { set({ error: error.message, loading: false }); throw error; }
  },
  async register(input) {
    set({ loading: true, error: '' });
    try { const data = await post('/auth/register', input); setSession(data); set({ user: data.user, loading: false }); return data.user; }
    catch (error) { set({ error: error.message, loading: false }); throw error; }
  },
  async updateProfile(input) {
    const data = await put('/account/profile', input);
    const token = localStorage.getItem('commerce_token');
    setSession({ token, user: data.user });
    set({ user: data.user });
    return data.user;
  },
  logout() { clearSession(); set({ user: null, error: '' }); }
}));
