'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { resumeApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@skillsync/ui';

export default function ResumesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [resumes, setResumes] = useState<{ id: string; originalFilename: string; fileSize: number; createdAt: string; status: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchResumes();
    }
  }, [user, authLoading, router]);

  const fetchResumes = async () => {
    try {
      setIsLoading(true);
      const res = await resumeApi.list();
      if (res.data?.resumes) {
        setResumes(res.data.resumes);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load resumes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await resumeApi.delete(id);
      setResumes(resumes.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete resume');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
      </main>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resume Vault & AI Parser</h1>
            <p className="text-sm text-gray-500">Upload PDF/DOCX resumes, run AI extraction, and confirm skills into your profile.</p>
          </div>
          <Link href="/resumes/new">
            <Button className="justify-center gap-2">
              <span>📄</span> Upload New Resume
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Your Uploaded Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-gray-400">Loading resumes...</div>
            ) : resumes.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mx-auto text-xl font-bold">
                  📄
                </div>
                <h3 className="font-bold text-gray-900 text-base">No resumes uploaded yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Upload your resume to automatically extract skills, work history, and project evidence into your profile.
                </p>
                <Link href="/resumes/new" className="inline-block pt-2">
                  <Button size="sm">Upload Your First Resume</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((res) => (
                  <div key={res.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 transition-colors gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm flex items-center justify-center shrink-0">
                        📄
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base">{res.originalFilename}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>{formatFileSize(res.fileSize)}</span>
                          <span>•</span>
                          <span>{new Date(res.createdAt).toLocaleDateString()}</span>
                          <Badge variant="outline" className="text-[10px] uppercase ml-1">
                            {res.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/resumes/${res.id}/analyze`}>
                        <Button size="sm" variant="default" className="text-xs">
                          Analyze & Review →
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(res.id)} className="text-xs text-red-600 hover:bg-red-50">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}