import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../api/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native';

// Define the shape of the auth context
type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ data: { user: User | null } | null; error: any | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
  updatePassword: (password: string) => Promise<{ error: any | null }>;
};

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signUp: async () => ({ data: null, error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component to wrap the app
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check for an existing session when the app loads
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        // Check if user is admin
        if (data.session?.user) {
          await checkAdminStatus(data.session.user.id);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Set up a listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        
        // Check admin status when auth state changes
        if (newSession?.user) {
          await checkAdminStatus(newSession.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );
    
    // Clean up the listener when the component unmounts
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  // Check if the user has admin privileges
  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(data?.is_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (!error) {
        Alert.alert(
          'Verification email sent',
          'Please check your email to verify your account before signing in.'
        );
      }
      
      return { data, error };
    } catch (error) {
      console.error('Error signing up:', error);
      return { data: null, error };
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Reset password (sends reset email)
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'poolqueue://reset-password',
      });
      
      if (!error) {
        Alert.alert(
          'Password reset email sent',
          'Please check your email for a link to reset your password.'
        );
      }
      
      return { error };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error };
    }
  };

  // Update password (after reset)
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Error updating password:', error);
      return { error };
    }
  };

  // Provide the auth context to children components
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
