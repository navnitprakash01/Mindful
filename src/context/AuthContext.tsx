import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';

interface AuthState {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: UserProfile | null) => void;
  getAccessToken: () => string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const signedOutState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'mindful_auth_user';
const REMEMBER_KEY = 'mindful_remember_me';

const defaultAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';

const buildProfileFromUser = (authUser: User | null, overrides?: Partial<UserProfile> | null): UserProfile => ({
  name: overrides?.name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0]?.replace(/[._]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) || 'Mindful User',
  email: overrides?.email || authUser?.email || '',
  avatarUrl: overrides?.avatarUrl || authUser?.user_metadata?.avatar_url || defaultAvatarUrl,
  plan: overrides?.plan || 'Mindful Pro',
  joinedDate: overrides?.joinedDate || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  dailyGoalMinutes: overrides?.dailyGoalMinutes ?? 15,
  streakCount: overrides?.streakCount ?? 1,
  notificationsEnabled: overrides?.notificationsEnabled ?? true,
  theme: overrides?.theme || 'dark',
  selectedSoundscape: overrides?.selectedSoundscape || 'None',
});

const parseProfileRow = (authUser: User, profileRow: Record<string, unknown> | null | undefined): UserProfile => {
  if (!profileRow) {
    return buildProfileFromUser(authUser);
  }

  return buildProfileFromUser(authUser, {
    name: typeof profileRow.full_name === 'string' ? profileRow.full_name : undefined,
    email: typeof profileRow.email === 'string' ? profileRow.email : undefined,
    avatarUrl: typeof profileRow.avatar_url === 'string' && profileRow.avatar_url ? profileRow.avatar_url : undefined,
    dailyGoalMinutes: typeof profileRow.daily_goal === 'number' ? profileRow.daily_goal : undefined,
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [state, setState] = useState<AuthState>(initialState);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const setUser = useCallback((user: UserProfile | null) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }));
  }, []);

  const persistUser = useCallback((user: UserProfile | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const getAccessToken = useCallback(() => {
    return state.session?.access_token ?? null;
  }, [state.session]);

  const ensureProfileExists = useCallback(async (authUser: User, providedName?: string): Promise<UserProfile> => {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, daily_goal')
      .eq('id', authUser.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Failed to fetch profile from Supabase', fetchError);
      throw fetchError;
    }

    if (existingProfile) {
      return parseProfileRow(authUser, existingProfile);
    }

    const profilePayload = {
      id: authUser.id,
      full_name: providedName?.trim() || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Mindful User',
      avatar_url: null,
      daily_goal: 10,
    };

    const { data, error: insertError } = await supabase
      .from('profiles')
      .insert(profilePayload)
      .select('id, full_name, avatar_url, daily_goal')
      .single();

    if (insertError) {
      console.error('Failed to create profile row in Supabase', insertError);
      throw insertError;
    }

    return parseProfileRow(authUser, data);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!email || !password) {
      setError('Please fill in all fields');
      return false;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) {
        const message = error?.message || 'Invalid login credentials.';
        setError(message);
        return false;
      }

      const profile = await ensureProfileExists(data.user);
      const nextUser = buildProfileFromUser(data.user, profile);
      setState(prev => ({ ...prev, user: nextUser, session: data.session, isAuthenticated: true, isLoading: false, error: null }));
      persistUser(nextUser);
      showToast(`Welcome back to your Sanctuary, ${nextUser.name} ✨`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in right now.';
      setError(message);
      return false;
    }
  }, [ensureProfileExists, persistUser, setError, showToast]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return false;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    if (strength < 3) {
      setError('Password is too weak. Use uppercase, lowercase, numbers & symbols');
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error || !data.user) {
        const message = error?.message || 'Unable to create your account right now.';
        setError(message);
        return false;
      }

      const profile = await ensureProfileExists(data.user, name);
      const nextUser = buildProfileFromUser(data.user, profile);
      if (data.session) {
        setState(prev => ({ ...prev, user: nextUser, session: data.session, isAuthenticated: true, isLoading: false, error: null }));
        persistUser(nextUser);
        showToast(`Your Sanctuary is ready, ${nextUser.name} ✨`);
      } else {
        setState(prev => ({ ...prev, isLoading: false, error: null }));
        showToast('Please verify your email before signing in.');
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create your account right now.';
      setError(message);
      return false;
    }
  }, [ensureProfileExists, persistUser, setError, setUser, showToast]);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await supabase.auth.signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign out right now.';
      setError(message);
      return;
    }

    setState(signedOutState);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    showToast('You have been signed out');
  }, [setError, showToast]);

  const forgotPassword = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      if (error) {
        throw error;
      }
      setState(prev => ({ ...prev, isLoading: false }));
      showToast('Password reset link sent to your email 📧');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send a password reset email.';
      setError(message);
    }
  }, [setError, showToast]);

  const resetPassword = useCallback(async (_token: string, newPassword: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }
      setState(prev => ({ ...prev, isLoading: false }));
      showToast('Password has been reset successfully 🔐');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset your password.';
      setError(message);
    }
  }, [setError, showToast]);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          const profile = await ensureProfileExists(session.user);
          const nextUser = buildProfileFromUser(session.user, profile);
          setState(prev => ({ ...prev, user: nextUser, session, isAuthenticated: true, isLoading: false, error: null }));
          persistUser(nextUser);
} else {
          setState(prev => ({ ...prev, user: null, session: null, isLoading: false, error: null }));
          persistUser(null);
        }
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Unable to restore your session.';
        setError(message);
      }
    };

    void initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        try {
          const profile = await ensureProfileExists(session.user);
          const nextUser = buildProfileFromUser(session.user, profile);
          setState(prev => ({ ...prev, user: nextUser, session, isAuthenticated: true, isLoading: false, error: null }));
          persistUser(nextUser);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to restore your session.';
          setError(message);
        }
      } else {
        setState(prev => ({ ...prev, user: null, session: null, isAuthenticated: false, isLoading: false, error: null }));
        persistUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfileExists, persistUser, setError]);

  const setRememberMe = useCallback((remember: boolean) => {
    if (remember && state.user) {
      localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, [state.user]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        resetPassword,
        clearError,
        setUser,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};