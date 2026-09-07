'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@skillsync/ui';

export default function SettingsPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-500">Manage security settings, session configuration, and account preferences.</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Account & Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg">
                <dt className="text-gray-500 font-medium mb-1">Email Address</dt>
                <dd className="font-semibold text-gray-900 font-mono">{user?.email}</dd>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <dt className="text-gray-500 font-medium mb-1">Username</dt>
                <dd className="font-semibold text-gray-900">{user?.username || 'Not configured'}</dd>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <dt className="text-gray-500 font-medium mb-1">System Role</dt>
                <dd className="font-semibold text-gray-900 flex items-center gap-2">
                  <Badge variant={user?.role === 'ADMIN' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                    {user?.role || 'USER'}
                  </Badge>
                </dd>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <dt className="text-gray-500 font-medium mb-1">Account Status</dt>
                <dd className="font-semibold text-emerald-600 uppercase">{user?.status}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Security & Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Active Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl">
              <div>
                <p className="font-semibold text-gray-900">Current Session Token</p>
                <p className="text-gray-500 mt-0.5">HTTP-Only secure cookie token (`skillsync_session`)</p>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                ACTIVE
              </Badge>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:bg-red-50 text-xs">
                Sign Out Of Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
