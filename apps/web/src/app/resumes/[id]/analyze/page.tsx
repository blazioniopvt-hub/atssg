'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { resumeApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@skillsync/ui';

export default function ResumeAnalyzePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const resumeId = params.id as string;

  const [analysis, setAnalysis] = useState<{
  parsedContent?: {
    skills?: Array<{ name?: string; originalName?: string; confidence?: number }>;
    experiences?: Array<{ role?: string; title?: string; company?: string; description?: string }>;
    projects?: Array<{ title?: string; name?: string; description?: string }>;
    education?: Array<{ degree?: string; institution?: string }>;
  };
  skills?: Array<{ name?: string; originalName?: string; confidence?: number }>;
  experiences?: Array<{ role?: string; title?: string; company?: string; description?: string }>;
  projects?: Array<{ title?: string; name?: string; description?: string }>;
  education?: Array<{ degree?: string; institution?: string }>;
  data?: { addedSkillsCount?: number; addedProjectsCount?: number };
} | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection states
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedExperiences, setSelectedExperiences] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [confirmedMsg, setConfirmedMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user && resumeId) {
      loadResumeAnalysis();
    }
  }, [user, authLoading, resumeId, router]);

  const loadResumeAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // First check existing analysis
      const existing = await resumeApi.getAnalysis(resumeId).catch(() => null);
      if (existing?.data) {
        setAnalysis(existing.data);
        initSelections(existing.data);
      } else {
        // Run fresh analysis
        await runAnalysis();
      }
    } catch (err) {
      console.error('Error loading analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resume analysis');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await resumeApi.analyze(resumeId);
      if (res.data) {
        setAnalysis(res.data);
        initSelections(res.data);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Resume AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const initSelections = (data: {
    parsedContent?: {
      skills?: Array<{ name?: string; originalName?: string; confidence?: number }>;
      experiences?: Array<{ role?: string; title?: string; company?: string; description?: string }>;
    };
    skills?: Array<{ name?: string; originalName?: string; confidence?: number }>;
    experiences?: Array<{ role?: string; title?: string; company?: string; description?: string }>;
  }) => {
    const rawSkills = data?.parsedContent?.skills || data?.skills || [];
    const skillSet = new Set<string>();
    rawSkills.forEach((s) => {
      const name = typeof s === 'string' ? s : s.name || s.originalName;
      if (name) skillSet.add(name);
    });
    setSelectedSkills(skillSet);

    const rawExp = data?.parsedContent?.experiences || data?.experiences || [];
    const expSet = new Set<string>();
    rawExp.forEach((e, idx: number) => {
      const title = e.role || e.title || `Experience-${idx}`;
      expSet.add(title);
    });
    setSelectedExperiences(expSet);
  };

  const toggleSkill = (skillName: string) => {
    const next = new Set(selectedSkills);
    if (next.has(skillName)) next.delete(skillName);
    else next.add(skillName);
    setSelectedSkills(next);
  };

  const toggleAllSkills = () => {
    const rawSkills = analysis?.parsedContent?.skills || analysis?.skills || [];
    if (selectedSkills.size > 0) {
      setSelectedSkills(new Set());
    } else {
      const all = new Set<string>();
      rawSkills.forEach((s) => {
        const name = typeof s === 'string' ? s : s.name || s.originalName;
        if (name) all.add(name);
      });
      setSelectedSkills(all);
    }
  };

  const [confirmedData, setConfirmedData] = useState<{
    addedSkillsCount?: number;
    targetRole?: { id: string; title: string };
    readinessScore?: number | null;
  } | null>(null);

  const handleConfirmSelected = async () => {
    if (!resumeId) return;
    setConfirming(true);
    setError(null);
    setConfirmedMsg('');
    setConfirmedData(null);

    try {
      const res = await resumeApi.confirm(resumeId, {
        acceptedSkills: Array.from(selectedSkills),
        acceptedExperiences: Array.from(selectedExperiences),
      });

      const data = res.data as any;
      setConfirmedData(data);

      if (data?.targetRole && data?.readinessScore !== null && data?.readinessScore !== undefined) {
        setConfirmedMsg(
          `Confirmed! Added ${data.addedSkillsCount || selectedSkills.size} skills. Readiness for ${data.targetRole.title} is now ${data.readinessScore}%.`
        );
      } else {
        setConfirmedMsg(
          `Confirmed! Added ${data?.addedSkillsCount || selectedSkills.size} skills to your verified profile.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm resume suggestions.');
    } finally {
      setConfirming(false);
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
      </main>
    );
  }

  const parsed = analysis?.parsedContent || analysis || {};
  const extractedSkills: Array<any> = parsed.skills || [];
  const extractedExp: Array<{ role?: string; title?: string; company?: string; description?: string }> = parsed.experiences || [];
  const extractedProj: Array<{ title?: string; name?: string; description?: string }> = parsed.projects || [];
  const extractedEdu: Array<{ degree?: string; institution?: string }> = parsed.education || [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Link href="/resumes" className="text-xs text-primary-600 font-semibold hover:underline mb-2 inline-block">
            ← Back to Resume Vault
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">AI Resume Intelligence & Evidence Engine</h1>
          <p className="text-sm text-gray-500">Review AI-extracted skills, evidence excerpts, and role readiness before confirming into your profile.</p>
        </div>

        {confirmedMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>{confirmedMsg}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button size="sm" variant="outline" className="text-xs">
                  Dashboard
                </Button>
              </Link>
              <Link href="/roles">
                <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  View Skill Gaps →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium flex items-center justify-between">
            <span>⚠️ {error}</span>
            <Button size="sm" variant="outline" onClick={runAnalysis}>Re-run Analysis</Button>
          </div>
        )}

        {loading || analyzing ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
              <h3 className="font-bold text-gray-900 text-lg">Analyzing Resume Content with AI...</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">Extracting technical skills, proficiency baselines, project evidence, and work history.</p>
            </CardContent>
          </Card>
        ) : !analysis ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <h3 className="font-bold text-gray-900 text-base">No Analysis Data Available</h3>
              <Button size="sm" onClick={runAnalysis}>Start AI Extraction</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Action Bar */}
            <Card className="bg-primary-50/50 border-primary-100">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-primary-900 text-sm sm:text-base">Review & Confirm Extracted Items</h3>
                  <p className="text-xs text-primary-700">Select the items you want to persist into your profile.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={toggleAllSkills}>
                    {selectedSkills.size > 0 ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button size="sm" onClick={handleConfirmSelected} disabled={confirming || selectedSkills.size === 0}>
                    {confirming ? 'Saving Profile...' : `Confirm ${selectedSkills.size} Selected Skills →`}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Skills Grid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-gray-900">Extracted Skills ({extractedSkills.length})</CardTitle>
                <Badge variant="outline" className="text-xs">{selectedSkills.size} Selected</Badge>
              </CardHeader>
              <CardContent>
                {extractedSkills.length === 0 ? (
                  <p className="text-xs text-gray-400">No skills detected in document.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {extractedSkills.map((s, idx: number) => {
                      const name = (typeof s === 'string' ? s : s.name || s.originalName) || 'Skill';
                      const confidence = typeof s === 'object' && s.confidence ? Math.round(s.confidence * 100) : 85;
                      const proficiency = typeof s === 'object' && s.proficiency ? s.proficiency : 'INTERMEDIATE';
                      const evidence = typeof s === 'object' && s.evidence ? s.evidence : '';
                      const isSelected = selectedSkills.has(name);

                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => toggleSkill(name)}
                          className={`p-3.5 border rounded-xl cursor-pointer transition-all flex items-start justify-between text-left w-full ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50/30 shadow-xs'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 mt-0.5 text-primary-600 rounded focus:ring-primary-500 border-gray-300 pointer-events-none"
                            />
                            <div className="truncate text-xs space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900 truncate">{name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded font-mono uppercase font-semibold">
                                  {proficiency}
                                </span>
                              </div>
                              <span className="text-gray-400 text-[10px] block">Confidence: {confidence}%</span>
                              {evidence && (
                                <p className="text-[10px] text-gray-500 italic truncate max-w-[200px]" title={evidence}>
                                  &ldquo;{evidence}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] shrink-0 ml-2">
                            {isSelected ? 'ACCEPT' : 'SKIP'}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extracted Work History & Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-900">Work Experience ({extractedExp.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {extractedExp.length === 0 ? (
                    <p className="text-xs text-gray-400">No experience blocks extracted.</p>
                  ) : (
                    extractedExp.map((e, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between font-bold text-gray-900">
                          <span>{e.role || e.title || 'Role'}</span>
                          <span className="text-gray-500 font-normal">{e.company}</span>
                        </div>
                        {e.description && <p className="text-gray-600 line-clamp-2">{e.description}</p>}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-900">Extracted Projects & Education</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {extractedProj.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Projects ({extractedProj.length})</p>
                      {extractedProj.map((p, idx: number) => (
                        <div key={idx} className="p-2.5 bg-gray-50 rounded-lg">
                          <span className="font-bold text-gray-900 block">{p.title || p.name}</span>
                          <p className="text-gray-600 text-[11px] mt-0.5">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {extractedEdu.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Education ({extractedEdu.length})</p>
                      {extractedEdu.map((ed, idx: number) => (
                        <div key={idx} className="p-2.5 bg-gray-50 rounded-lg flex justify-between">
                          <span className="font-bold text-gray-900">{ed.degree || ed.institution}</span>
                          <span className="text-gray-500">{ed.institution}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}