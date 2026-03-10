import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (username: string, password: string) => Promise<{ success: boolean, message?: string }>;
  register: (userData: Omit<User, 'id' | 'isAuthorized'>, password?: string) => Promise<User | null>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  markAnnouncementAsRead: (announcementId: string) => Promise<void>;
  authorizeUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('elite_pg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isInitializing, setIsInitializing] = useState(true);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    const mappedUsers: User[] = (data || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      role: u.role as UserRole,
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      isAuthorized: u.is_authorized,
      password: u.password,
      branchId: u.branch_id,
      seenAnnouncements: u.seen_announcements || []
    }));
    setUsers(mappedUsers);

    if (user) {
      const refreshedUser = mappedUsers.find(mu => mu.id === user.id);
      if (refreshedUser) {
        setUser(refreshedUser);
        localStorage.setItem('elite_pg_user', JSON.stringify(refreshedUser));
      }
    }
    setIsInitializing(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean, message?: string }> => {
    await fetchUsers(); // Refresh to get latest state

    const { data, error } = await supabase.from('users')
      .select('*')
      .or(`username.eq.${username},email.eq.${username}`)
      .single();

    if (error || !data) {
      return { success: false, message: 'User not found' };
    }

    if (data.password && data.password !== password) {
      return { success: false, message: 'Invalid password' };
    }

    const mappedUser: User = {
      id: data.id,
      username: data.username,
      role: data.role as UserRole,
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatar: data.avatar,
      isAuthorized: data.is_authorized,
      password: data.password,
      branchId: data.branch_id,
      seenAnnouncements: data.seen_announcements || []
    };

    setUser(mappedUser);
    localStorage.setItem('elite_pg_user', JSON.stringify(mappedUser));
    return { success: true };
  };

  const register = async (userData: Omit<User, 'id' | 'isAuthorized'>, password?: string): Promise<User | null> => {
    const { data: existingData } = await supabase.from('users')
      .select('id')
      .or(`username.eq.${userData.username},email.eq.${userData.email}`);

    if (existingData && existingData.length > 0) {
      toast.error('A user with this username or email already exists.');
      return null;
    }

    const newId = `u${Date.now()}`;
    const newIsAuthorized = userData.role === 'admin' ? true : false;
    const newPassword = password || '123456';

    const dbData = {
      id: newId,
      username: userData.username,
      role: userData.role,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || null,
      avatar: userData.avatar || null,
      is_authorized: newIsAuthorized,
      password: newPassword,
      branch_id: userData.branchId || null,
      seen_announcements: userData.seenAnnouncements || []
    };

    const { error } = await supabase.from('users').insert(dbData);
    if (error) {
      console.error(error);
      toast.error(error.message);
      return null;
    }

    await fetchUsers();
    const newUser: User = { ...userData, id: newId, isAuthorized: newIsAuthorized, password: newPassword, seenAnnouncements: userData.seenAnnouncements || [] };
    return newUser;
  };

  const authorizeUser = async (userId: string) => {
    await supabase.from('users').update({ is_authorized: true }).eq('id', userId);
    await fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    await supabase.from('users').delete().eq('id', userId);
    await fetchUsers();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('elite_pg_user');
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (user) {
      await updateUser(user.id, updates);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.isAuthorized !== undefined) dbUpdates.is_authorized = updates.isAuthorized;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    if (updates.branchId !== undefined) dbUpdates.branch_id = updates.branchId;
    if (updates.seenAnnouncements !== undefined) dbUpdates.seen_announcements = updates.seenAnnouncements;

    const { error } = await supabase.from('users').update(dbUpdates).eq('id', userId);
    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      await fetchUsers();
    }
  };

  const markAnnouncementAsRead = async (announcementId: string) => {
    if (user) {
      const seen = user.seenAnnouncements || [];
      if (!seen.includes(announcementId)) {
        await updateProfile({ seenAnnouncements: [...seen, announcementId] });
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      users,
      login,
      register,
      logout,
      updateProfile,
      updateUser,
      markAnnouncementAsRead,
      authorizeUser,
      deleteUser,
      isAuthenticated: !!user,
      isInitializing
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
