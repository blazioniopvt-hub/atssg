'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { resumeApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui';

export default function NewResumePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    // Check size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const res = await resumeApi.upload(file);
      if (res.data?.resumeId) {
        router.push(`/resumes/${res.data.resumeId}/analyze`);
      } else {
        throw new Error('Invalid upload response from server.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload resume file.');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link href="/resumes" className="text-xs text-primary-600 font-semibold hover:underline mb-2 inline-block">
            ← Back to Resume Vault
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Upload Resume for AI Parsing</h1>
          <p className="text-sm text-gray-500">Upload your resume to extract skills, project evidence, and work history.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Upload File (PDF, DOCX, TXT)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
                  dragActive ? 'border-primary-500 bg-primary-50/50 scale-[1.01]' : 'border-gray-300 bg-gray-50/50 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center mx-auto mb-4 text-2xl">
                  📄
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">
                  Drag and drop your resume file here
                </h3>
                <p className="text-xs text-gray-500 mb-6">
                  Supports PDF, DOCX, or TXT formats up to 10MB
                </p>

                <label className="inline-block">
                  <span className="bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs">
                    {uploading ? 'Uploading & Parsing...' : 'Select File From Computer'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}