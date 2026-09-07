'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@skillsync/ui';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      setDisplayName(user.displayName || user.username || '');
    }
  }, [user, authLoading, router]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
      </main>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // Simulate/save profile data
      await new Promise((res) => setTimeout(res, 400));
      setSuccessMsg('Profile updated successfully!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
          <p className="text-sm text-gray-500">Manage your personal information, headline, and public profile details.</p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Details Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label htmlFor="display-name-input" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Display Name
                    </label>
                    <input
                      id="display-name-input"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="headline-input" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Professional Headline
                    </label>
                    <input
                      id="headline-input"
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Senior Full-Stack Engineer | AI & Cloud Architect"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="bio-textarea" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Bio / Executive Summary
                    </label>
                    <textarea
                      id="bio-textarea"
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief overview of your career, key skill highlights, and goals..."
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="location-input" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Location
                      </label>
                      <input
                        id="location-input"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. San Francisco, CA"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="website-input" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Website / Portfolio URL
                      </label>
                      <input
                        id="website-input"
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourportfolio.com"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving Changes...' : 'Save Profile'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Profile Card Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">Profile Card Preview</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
                  {(displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{displayName || 'Your Name'}</h3>
                  <p className="text-xs text-primary-600 font-medium">{headline || 'Add your professional headline'}</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Role: {user?.role || 'USER'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs uppercase">
                    {user?.status}
                  </Badge>
                </div>

                <div className="pt-4 border-t border-gray-100 text-left text-xs space-y-2">
                  <div>
                    <span className="text-gray-400 block font-medium">Email</span>
                    <span className="text-gray-900 font-mono">{user?.email}</span>
                  </div>
                  {location && (
                    <div>
                      <span className="text-gray-400 block font-medium">Location</span>
                      <span className="text-gray-900">{location}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Link href="/skills">
                    <Button variant="outline" size="sm" className="w-full">
                      View Skills Profile →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
