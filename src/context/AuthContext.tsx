import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (username: string, password: string) => Promise<{ success: boolean, message?: string, needsPasswordSetup?: boolean }>;
  loginWithGoogle: (intent: 'login' | 'signup') => Promise<void>;
  setGoogleUserPassword: (email: string, password: string) => Promise<{ success: boolean, message?: string }>;
  register: (userData: Omit<User, 'id' | 'isAuthorized'> & { inviteCode?: string }, password?: string) => Promise<{ success: boolean, message?: string, existingUser?: boolean, user?: User | null }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  markAnnouncementAsRead: (announcementId: string) => Promise<void>;
  authorizeUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  isAuthenticated: boolean;
  isInitializing: boolean;
  googleAuthStatus: 'user_not_found' | 'user_already_exists' | null;
  clearGoogleAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('elite_pg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const provisioningRef = useRef(false);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      setIsInitializing(false);
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
      requiresPasswordChange: u.requires_password_change || false,
      password: u.password,
      branchId: u.branch_id,
      provider: u.provider || 'local',
      google_id: u.google_id,
      seenAnnouncements: u.seen_announcements || []
    }));
    setUsers(mappedUsers);

    // Refresh current user: read from localStorage directly to avoid stale closure
    const saved = localStorage.getItem('elite_pg_user');
    const currentUser: User | null = saved ? JSON.parse(saved) : null;
    if (currentUser) {
      const refreshedUser = mappedUsers.find(mu => mu.id === currentUser.id);
      if (refreshedUser) {
        // Admins/supers are always authorized regardless of the DB `is_authorized` flag
        const authorizedUser: User = {
          ...refreshedUser,
          isAuthorized: (refreshedUser.role === 'admin' || refreshedUser.role === 'super') ? true : refreshedUser.isAuthorized
        };
        setUser(authorizedUser);
        localStorage.setItem('elite_pg_user', JSON.stringify(authorizedUser));
      }
    }
    setIsInitializing(false);
  };

  const [googleAuthStatus, setGoogleAuthStatus] = useState<'user_not_found' | 'user_already_exists' | null>(null);
  const clearGoogleAuthStatus = () => setGoogleAuthStatus(null);

  // Helper: creates a new user + tenant record for an OAuth or manually created backend user
  const provisionNewUser = async (session: any, provider: 'local' | 'google', overrideBranchId?: string, isAuthorizedOverride?: boolean, roleOverride?: UserRole) => {
    let finalBranchId = overrideBranchId;
    if (!finalBranchId) {
      const { data: branches } = await supabase.from('pg_branches').select('id').limit(1);
      finalBranchId = branches?.[0]?.id || null;
    }
    const newId = `u${Date.now()}`;
    const newDbUser = {
      id: newId,
      username: session.user.email.split('@')[0] || `user${Date.now()}`,
      role: roleOverride || 'tenant',
      name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
      email: session.user.email,
      phone: null,
      avatar: session.user.user_metadata?.avatar_url || null,
      is_authorized: isAuthorizedOverride !== undefined ? isAuthorizedOverride : false,
      password: null,
      provider: provider,
      google_id: provider === 'google' ? session.user.id : null,
      branch_id: finalBranchId,
      seen_announcements: []
    };
    const { error: insertError } = await supabase.from('users').insert(newDbUser);
    if (insertError) {
      console.error('Failed to create user:', insertError);
      await supabase.auth.signOut();
      return;
    }
    
    // Only conditionally create tenant record if role is tenant
    if (newDbUser.role === 'tenant') {
      const { error: tenantError } = await supabase.from('tenants').insert({
        user_id: newId,
        name: newDbUser.name,
        email: newDbUser.email,
        phone: '0000000000',
        room_id: null,
        bed_number: 0,
        joining_date: new Date().toISOString().split('T')[0],
        rent_amount: 0,
        deposit_amount: 0,
        payment_due_date: 1,
        status: 'active',
        kyc_status: 'unsubmitted',
        branch_id: finalBranchId,
        rent_agreement_url: null
      });

      if (tenantError) {
        console.error('Tenant creation error:', tenantError);
        toast.error('Secondary record creation failed. Please contact admin.');
      } else {
        if (isAuthorizedOverride) {
          toast.success('Account created from invite successfully!');
        } else {
          toast.success('Account created! Please wait for an admin to authorize your access.');
        }
      }
    } else {
       if (isAuthorizedOverride) {
          toast.success('Admin/Staff Account created from invite successfully!');
       } else {
          toast.success('Account created! Please wait for an admin to authorize your access.');
       }
    }

    await fetchUsers();
    // Map and set the user
    const mappedUser = {
      id: newDbUser.id, username: newDbUser.username, role: newDbUser.role as any,
      name: newDbUser.name, email: newDbUser.email, phone: null, avatar: newDbUser.avatar,
      isAuthorized: newDbUser.is_authorized, password: null, branchId: finalBranchId,
      provider: provider, google_id: newDbUser.google_id, seenAnnouncements: []
    };
    setUser(mappedUser);
    localStorage.setItem('elite_pg_user', JSON.stringify(mappedUser));
  };

  useEffect(() => {
    fetchUsers();

    // Listen for Supabase OAuth sign-ins
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.email) {
        try {
          const intent = sessionStorage.getItem('google_auth_intent') as 'login' | 'signup' | null;
          sessionStorage.removeItem('google_auth_intent');

          // Check if user exists in custom users table based on email
          const { data: existingUsers, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email);

          let targetUser = existingUsers?.[0];

          // --- INTENT: LOGIN --- User wants to sign in with existing account
          if (intent === 'login') {
            if (!targetUser) {
              // User doesn't exist → reject, tell the page to redirect to sign-up
              await supabase.auth.signOut();
              toast.error('No account found for this Google account. Please sign up first.');
              setGoogleAuthStatus('user_not_found');
              return;
            }
            // User exists → fall through to set user below
          }
          // --- INTENT: SIGNUP --- User wants to create a new account
          else if (intent === 'signup') {
            if (targetUser) {
              // User already exists → reject, tell the page to redirect to login
              await supabase.auth.signOut();
              toast.error('An account with this Google email already exists. Please sign in instead.');
              setGoogleAuthStatus('user_already_exists');
              return;
            }
            if (provisioningRef.current) return;
            provisioningRef.current = true;
            try {
              // Extract invite code
              const inviteCode = sessionStorage.getItem('elitepg_invite_code');
              sessionStorage.removeItem('elitepg_invite_code'); // clean up
              
              let validInvite = null;
              
              if (inviteCode) {
                 const { data: codeInvites } = await supabase.from('user_invites').select('*').eq('invite_code', inviteCode).in('status', ['pending', 'active']).maybeSingle();
                 if (codeInvites) validInvite = codeInvites;
              }
              
              if (!validInvite) {
                 const { data: emailInvites } = await supabase.from('user_invites').select('*').eq('email', session.user.email).in('status', ['pending', 'active']).maybeSingle();
                 if (emailInvites) validInvite = emailInvites;
              }

              if (validInvite) {
                // Mark invite as accepted only if it's a specific single-user invite (has email)
                if (validInvite.email) {
                  await supabase.from('user_invites').update({ status: 'accepted' }).eq('id', validInvite.id);
                }
                // Create new user + tenant with branch assigned and authorized
                await provisionNewUser(session, 'google', validInvite.branch_id, true, validInvite.role as any);
                toast.success('Successfully joined branch from invite!');
              } else {
                // Reject login
                await supabase.auth.signOut();
                toast.error('You are not assigned to any PG branch. Please grab a valid invite link.');
                setGoogleAuthStatus('user_not_found'); // forces them back to sign in
                return;
              }
            } catch (err) {
               console.error("Error during invite signup processing:", err);
               await supabase.auth.signOut();
               toast.error("Registration failed. Try again.");
            } finally {
              setTimeout(() => { provisioningRef.current = false; }, 2000);
            }
            return;
          }
          else {
            if (!targetUser) {
              if (provisioningRef.current) return;
              provisioningRef.current = true;
              try {
                // Background provisioning (e.g. from a deep link or unknown flow)
                // We also need to check invites here just in case they arrived without Intent
                
                const inviteCode = sessionStorage.getItem('elitepg_invite_code');
                let validInvite = null;
                
                if (inviteCode) {
                   const { data: codeInvites } = await supabase.from('user_invites').select('*').eq('invite_code', inviteCode).in('status', ['pending', 'active']).maybeSingle();
                   if (codeInvites) validInvite = codeInvites;
                }
                
                if (!validInvite) {
                   const { data: emailInvites } = await supabase.from('user_invites').select('*').eq('email', session.user.email).in('status', ['pending', 'active']).maybeSingle();
                   if (emailInvites) validInvite = emailInvites;
                }

                if (validInvite) {
                   if (validInvite.email) {
                     await supabase.from('user_invites').update({ status: 'accepted' }).eq('id', validInvite.id);
                   }
                   await provisionNewUser(session, session.user.app_metadata?.provider === 'google' ? 'google' : 'local', validInvite.branch_id, true, validInvite.role as any);
                } else {
                   await supabase.auth.signOut();
                   toast.error('You are not assigned to any PG branch. Please grab a valid invite link.');
                   return;
                }
              } finally {
                sessionStorage.removeItem('elitepg_invite_code');
                setTimeout(() => { provisioningRef.current = false; }, 2000);
              }
              return;
            }
          }

          // If the user already exists (perhaps manually created), link their Google account
          if (targetUser && !targetUser.google_id) {
            await supabase.from('users').update({ provider: 'google', google_id: session.user.id }).eq('id', targetUser.id);
            targetUser.provider = 'google';
            targetUser.google_id = session.user.id;
          }

          if (targetUser) {
            const mappedUser: User = {
              id: targetUser.id,
              username: targetUser.username,
              role: targetUser.role as UserRole,
              name: targetUser.name,
              email: targetUser.email,
              phone: targetUser.phone,
              avatar: targetUser.avatar,
              isAuthorized: targetUser.is_authorized,
              password: targetUser.password,
              branchId: targetUser.branch_id,
              provider: targetUser.provider || 'local',
              google_id: targetUser.google_id,
              seenAnnouncements: targetUser.seen_announcements || []
            };
            setUser(mappedUser);
            localStorage.setItem('elite_pg_user', JSON.stringify(mappedUser));
            await fetchUsers();
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean, message?: string, needsPasswordSetup?: boolean }> => {
    const trimmedUsername = username.trim();
    console.log(`[Login Attempt] Username: "${trimmedUsername}"`);

    await fetchUsers(); // Refresh to get latest state

    const { data, error } = await supabase.from('users')
      .select('*')
      .or(`username.ilike.${trimmedUsername},email.ilike.${trimmedUsername}`)
      .maybeSingle();

    if (error) {
      console.error('[Login Error] Supabase Query:', error);
      return { success: false, message: 'Database error. Please try again later.' };
    }

    if (!data) {
      console.warn(`[Login Warning] User not found: "${trimmedUsername}"`);
      return { success: false, message: 'Invalid username or email' };
    }

    if (data.password === null || data.password === undefined || data.password === '') {
      console.info(`[Login Info] User needs password setup: "${trimmedUsername}"`);
      const isGoogle = data.provider === 'google';
      const message = isGoogle
        ? 'This account was created using Google. Please set a password for future manual logins.'
        : 'Your account was created by an admin. Please set your password to continue.';
      return { success: false, message, needsPasswordSetup: true };
    } else if (data.requires_password_change) {
      console.info(`[Login Info] User requires first-time password change: "${trimmedUsername}"`);
      return { success: false, message: 'Your account was created by an admin. Please set a new password to continue.', needsPasswordSetup: true };
    } else if (password && data.password !== password) {
      console.warn(`[Login Warning] Password mismatch for: "${trimmedUsername}"`);
      return { success: false, message: 'Invalid password' };
    } else if (!password) {
      return { success: false, message: 'Please provide a password.' };
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
      provider: data.provider || 'local',
      google_id: data.google_id,
      seenAnnouncements: data.seen_announcements || []
    };

    setUser(mappedUser);
    localStorage.setItem('elite_pg_user', JSON.stringify(mappedUser));
    return { success: true };
  };

  const register = async (userData: Omit<User, 'id' | 'isAuthorized'> & { inviteCode?: string, requiresPasswordChange?: boolean }, password?: string): Promise<{ success: boolean, message?: string, existingUser?: boolean, user?: User | null }> => {
    const { data: existingUsername } = await supabase.from('users')
      .select('id')
      .ilike('username', userData.username)
      .maybeSingle();

    if (existingUsername) {
      return { success: false, message: 'Username already taken', existingUser: true };
    }

    const { data: existingEmail } = await supabase.from('users')
      .select('id')
      .ilike('email', userData.email)
      .maybeSingle();

    if (existingEmail) {
      return { success: false, message: 'Email already registered', existingUser: true };
    }

    const newId = `u${Date.now()}`;
    let newIsAuthorized = (userData.role === 'admin' || userData.requiresPasswordChange) ? true : false;
    let finalBranchId = userData.branchId;
    let finalRole = userData.role;

    if (userData.inviteCode) {
      const { data: inviteData, error: inviteErr } = await supabase.from('user_invites')
         .select('*')
         .eq('invite_code', userData.inviteCode)
         .in('status', ['pending', 'active'])
         .maybeSingle();

      if (inviteData && !inviteErr) {
        finalBranchId = inviteData.branch_id;
        finalRole = inviteData.role as UserRole;
        newIsAuthorized = true;
        // mark as accepted only if it's a specific single-user invite (has email)
        if (inviteData.email) {
          await supabase.from('user_invites').update({ status: 'accepted' }).eq('id', inviteData.id);
        }
      } else {
        return { success: false, message: 'Invalid or expired invite code' };
      }
    } else if (userData.role !== 'admin' && userData.role !== 'super' && !userData.requiresPasswordChange) {
      return { success: false, message: 'An invite code is required to create an account.' };
    }

    const newPassword = password || null;

    const dbData = {
      id: newId,
      username: userData.username,
      role: finalRole,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || null,
      avatar: userData.avatar || null,
      is_authorized: newIsAuthorized,
      password: newPassword,
      branch_id: finalBranchId || null,
      provider: 'local',
      google_id: null,
      seen_announcements: userData.seenAnnouncements || [],
      requires_password_change: userData.requiresPasswordChange || false
    };

    const { error } = await supabase.from('users').insert(dbData);
    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    // If the new user is a tenant, also create a tenant record so they appear in the Tenants tab
    if (finalRole === 'tenant') {
      if (!finalBranchId) {
        const { data: branches } = await supabase.from('pg_branches').select('id').limit(1);
        finalBranchId = branches?.[0]?.id || null;
      }

      const { error: tenantError } = await supabase.from('tenants').insert({
        user_id: newId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '0000000000',
        room_id: null,
        bed_number: 0,
        joining_date: new Date().toISOString().split('T')[0],
        rent_amount: 0,
        deposit_amount: 0,
        payment_due_date: 1,
        status: 'active',
        kyc_status: 'unsubmitted',
        branch_id: finalBranchId,
        rent_agreement_url: null
      });

      if (tenantError) {
        console.error('Tenant insertion error:', tenantError);
        toast.error('Failed to create tenant record: ' + tenantError.message);
      }
    }

    await fetchUsers();
    const newUser: User = { ...userData, role: finalRole, branchId: finalBranchId, id: newId, isAuthorized: newIsAuthorized, password: newPassword, provider: 'local', seenAnnouncements: userData.seenAnnouncements || [] };
    return { success: true, user: newUser };
  };

  const loginWithGoogle = async (intent: 'login' | 'signup') => {
    sessionStorage.setItem('google_auth_intent', intent);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) {
      sessionStorage.removeItem('google_auth_intent');
      toast.error(error.message);
    }
  };

  const setGoogleUserPassword = async (loginId: string, password: string): Promise<{ success: boolean, message?: string }> => {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, provider')
      .or(`username.ilike.${loginId},email.ilike.${loginId}`)
      .maybeSingle();

    if (fetchError || !userData) {
      return { success: false, message: 'User not found' };
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password,
        requires_password_change: false 
      })
      .eq('id', userData.id);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    return { success: true, message: 'Password set successfully. You can now login.' };
  };

  const authorizeUser = async (userId: string) => {
    await supabase.from('users').update({ is_authorized: true }).eq('id', userId);
    await fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    await supabase.from('users').delete().eq('id', userId);
    await fetchUsers();
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
      toast.error(error.message);
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
      loginWithGoogle,
      setGoogleUserPassword,
      register,
      logout,
      updateProfile,
      updateUser,
      markAnnouncementAsRead,
      authorizeUser,
      deleteUser,
      isAuthenticated: !!user,
      isInitializing,
      googleAuthStatus,
      clearGoogleAuthStatus
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
