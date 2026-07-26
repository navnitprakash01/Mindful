import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { useAuth } from './AuthContext';

interface ProfileContextType {
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const createDefaultProfile = (fallbackName = 'Mindful User'): UserProfile => ({
  name: fallbackName,
  email: '',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  plan: 'Mindful Pro',
  joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  dailyGoalMinutes: 15,
  streakCount: 1,
  notificationsEnabled: true,
  theme: 'dark',
  selectedSoundscape: 'None',
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('mindful_profile');
    if (saved) {
      try {
        return JSON.parse(saved) as UserProfile;
      } catch {
        return createDefaultProfile();
      }
    }

    return createDefaultProfile(authUser?.name);
  });

  useEffect(() => {
    if (authUser) {
      setUserProfile(prev => {
        const nextProfile = { ...prev, ...authUser };
        localStorage.setItem('mindful_profile', JSON.stringify(nextProfile));
        return nextProfile;
      });
      return;
    }

    setUserProfile(createDefaultProfile());
    localStorage.removeItem('mindful_profile');
  }, [authUser]);

  useEffect(() => {
    if (authUser) {
      localStorage.setItem('mindful_profile', JSON.stringify(userProfile));
    }
  }, [authUser, userProfile]);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <ProfileContext.Provider value={{ userProfile, updateUserProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
};