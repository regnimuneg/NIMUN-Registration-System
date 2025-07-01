'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MemberGuardProps {
  children: React.ReactNode;
}

const MEMBER_PASSWORD = 'JNIMUN2025@Member'; // Change as needed

export default function MemberGuard({ children }: MemberGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const memberAuth = sessionStorage.getItem('memberAuth');
    if (memberAuth === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [isMounted]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === MEMBER_PASSWORD) {
      sessionStorage.setItem('memberAuth', 'true');
      setIsAuthenticated(true);
      setError('');
      setAttempts(0);
      setPassword('');
    } else {
      setAttempts(prev => prev + 1);
      setError(`Invalid password. Attempt ${attempts + 1}/3`);
      setPassword('');
      if (attempts >= 2) {
        setError('Too many failed attempts. Redirecting to home page...');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('memberAuth');
    setIsAuthenticated(false);
    setPassword('');
    setError('');
    setAttempts(0);
  };

  if (!isMounted || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Member Access Required
            </h2>
            <p className="text-gray-600 mb-8">
              Please enter the member password to access the member dashboard.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Member Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter password"
                disabled={attempts >= 3}
                autoFocus
              />
            </div>
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={!password.trim() || attempts >= 3}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {attempts >= 3 ? 'Blocked' : 'Access Member Dashboard'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Back to Home
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end p-2">
        <button
          onClick={handleLogout}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
} 