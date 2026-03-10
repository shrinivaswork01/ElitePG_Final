import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UnauthorizedPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center mb-6">
        <ShieldAlert className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {user && !user.isAuthorized ? 'Authorization Pending' : 'Access Denied'}
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
        {user && !user.isAuthorized 
          ? 'To access app needs authorization contact admin/manager first.'
          : "You don't have permission to view this page. Please contact your administrator if you believe this is an error."}
      </p>
      <div className="flex gap-4">
        {user && !user.isAuthorized ? (
          <button
            onClick={() => logout()}
            className="px-8 py-3 bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white font-semibold rounded-2xl hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
          >
            Logout
          </button>
        ) : (
          <Link
            to="/"
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
};
