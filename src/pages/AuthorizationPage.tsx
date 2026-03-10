import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, User as UserIcon, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';

export const AuthorizationPage = () => {
  const { users, authorizeUser, deleteUser } = useAuth();
  
  const pendingUsers = users.filter(u => !u.isAuthorized);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Authorization</h2>
        <p className="text-gray-500 dark:text-gray-400">Verify and authorize new user accounts.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {pendingUsers.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{user.name}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{user.email}</span>
                  <span>•</span>
                  <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">{user.role}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => deleteUser(user.id)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => authorizeUser(user.id)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle className="w-4 h-4" />
                Authorize
              </button>
            </div>
          </motion.div>
        ))}

        {pendingUsers.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-[#111111] rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
            <Shield className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Pending Requests</h3>
            <p className="text-gray-500 dark:text-gray-400">All user accounts are currently authorized.</p>
          </div>
        )}
      </div>
    </div>
  );
};
