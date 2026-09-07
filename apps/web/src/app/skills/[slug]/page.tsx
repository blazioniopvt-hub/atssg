'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { skillGraphApi, skillIntelligenceApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Button } from '@skillsync/ui';
import { Badge } from '@skillsync/ui';
import Link from 'next/link';
import type { SkillConfidenceDTO } from '@skillsync/types';

interface SkillDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  iconUrl: string | null;
  isVerified: boolean;
  demandLevel: string;
  createdAt: string;
}

interface SkillRelationshipDTO {
  skill: {
    id: string;
    name: string;
    slug: string;
    category: string;
    subcategory: string | null;
  };
  type: string;
  strength: number;
}

interface SkillGapItem {
  skill: {
    id: string;
    name: string;
    slug: string;
    category: string;
    subcategory: string | null;
  };
  status: 'KNOWN' | 'MISSING' | 'PARTIAL';
  userProficiencyLevel?: string;
  userConfidence?: number;
  requiredStrength?: number;
}

interface SkillGapAnalysis {
  targetSkill: {
    id: string;
    name: string;
    slug: string;
    category: string;
    subcategory: string | null;
  };
  prerequisites: SkillGapItem[];
  userKnownSkills: SkillGapItem[];
  missingPrerequisites: SkillGapItem[];
}

export default function SkillDetailPage({ params }: { params: { slug: string } }) {
  const { user, isLoading: authLoading } = useAuth();
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [relationships, setRelationships] = useState<SkillRelationshipDTO[]>([]);
  const [gap, setGap] = useState<SkillGapAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'gap' | 'evidence'>('overview');
  const [confidenceData, setConfidenceData] = useState<SkillConfidenceDTO | null>(null);
  const [loadingConfidence, setLoadingConfidence] = useState(false);

  const slug = params.slug;

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth/login';
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user && slug) {
      loadSkillData();
    }
  }, [user, slug]);

  const loadSkillData = async () => {
    try {
      setIsLoading(true);
      const [skillRes, relRes] = await Promise.all([
        skillGraphApi.getSkill(slug),
        skillGraphApi.getRelationships(slug),
      ]);
      setSkill(skillRes.data);
      setRelationships(relRes.data?.relationships || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skill');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGap = async () => {
    if (!skill) return;
    try {
      const gapRes = await skillGraphApi.getGap(slug);
      setGap(gapRes.data);
    } catch (err) {
      console.error('Failed to load skill gap:', err);
    }
  };

  const loadConfidence = async () => {
    try {
      setLoadingConfidence(true);
      const res = await skillIntelligenceApi.getSkillConfidence(slug);
      setConfidenceData(res.data);
    } catch (err) {
      console.warn('Failed to load skill confidence:', err);
    } finally {
      setLoadingConfidence(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gap' && !gap) {
      loadGap();
    }
    if (activeTab === 'evidence' && !confidenceData) {
      loadConfidence();
    }
  }, [activeTab]);

  const formatCategory = (cat: string) => cat.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'PREREQUISITE': return 'default';
      case 'SUBSKILL': return 'secondary';
      case 'SPECIALIZATION': return 'outline';
      case 'COMPLEMENTARY': return 'secondary';
      case 'RELATED': return 'outline';
      default: return 'outline';
    }
  };

  const getGapStatusBadge = (status: string) => {
    switch (status) {
      case 'KNOWN': return 'bg-emerald-100 text-emerald-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'MISSING': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      </AppShell>
    );
  }

  if (error || !skill) {
    return (
      <AppShell>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error || 'Skill not found.'}
        </div>
      </AppShell>
    );
  }

  // Group relationships by type
  const groupedRelationships = relationships.reduce((acc, rel) => {
    if (!acc[rel.type]) acc[rel.type] = [];
    acc[rel.type].push(rel);
    return acc;
  }, {} as Record<string, SkillRelationshipDTO[]>);

  const relationshipTypes = ['PREREQUISITE', 'SUBSKILL', 'SPECIALIZATION', 'COMPLEMENTARY', 'RELATED'];

  return (
    <AppShell>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/skills" className="text-primary-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Skills
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{skill.name}</h1>
          <p className="text-gray-600 mt-1">{skill.description || 'No description available'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={skill.isVerified ? 'default' : 'secondary'}>
            {skill.isVerified ? 'Verified' : 'Unverified'}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {formatCategory(skill.category)}
          </Badge>
          {skill.subcategory && (
            <Badge variant="secondary" className="capitalize">
              {skill.subcategory.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </Badge>
          )}
          <Badge variant={skill.demandLevel === 'HIGH' || skill.demandLevel === 'CRITICAL' ? 'default' : 'secondary'}>
            {skill.demandLevel} Demand
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-8" aria-label="Skill detail tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'relationships'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Relationships
          </button>
          <button
            onClick={() => setActiveTab('gap')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'gap'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Skill Gap
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'evidence'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Evidence & Confidence
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-medium text-gray-500">Category</span>
                  <p className="text-gray-900 capitalize">{formatCategory(skill.category)}</p>
                </div>
                {skill.subcategory && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Subcategory</span>
                    <p className="text-gray-900 capitalize">{skill.subcategory.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  </div>
                )}
                <div>
                  <span className="block text-sm font-medium text-gray-500">Demand Level</span>
                  <Badge variant={skill.demandLevel === 'HIGH' || skill.demandLevel === 'CRITICAL' ? 'default' : 'secondary'}>
                    {skill.demandLevel}
                  </Badge>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500">Verified</span>
                  <Badge variant={skill.isVerified ? 'default' : 'secondary'}>
                    {skill.isVerified ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500">Created</span>
                  <p className="text-gray-900">{new Date(skill.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {user && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Proficiency</CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.location.href = `/skill-intelligence`}>
                  Manage Skills
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center py-8">
                  Visit the Skill Intelligence page to add this skill to your profile and track your proficiency.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'relationships' && (
        <div className="space-y-6">
          {relationships.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">No relationships found for this skill.</p>
                <p className="text-sm text-gray-400 mt-1">Relationships are curated by the SkillSync team.</p>
              </CardContent>
            </Card>
          ) : (
            relationshipTypes
              .filter((type) => groupedRelationships[type] && groupedRelationships[type].length > 0)
              .map((type): JSX.Element => (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant={getTypeBadgeVariant(type)}>{type.replace('_', ' ')}</Badge>
                      <span className="text-gray-500 text-sm">({groupedRelationships[type].length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {groupedRelationships[type].map((rel): JSX.Element => (
                        <Link key={rel.skill.id} href={`/skills/${rel.skill.slug}`} className="block">
                          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-primary-300 transition-all duration-200">
                            <h3 className="font-semibold text-gray-900">{rel.skill.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="outline" className="capitalize text-xs">
                                {formatCategory(rel.skill.category)}
                              </Badge>
                              {rel.skill.subcategory && (
                                <Badge variant="secondary" className="capitalize text-xs">
                                  {rel.skill.subcategory.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                              <span>Strength: {Math.round(rel.strength * 100)}%</span>
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500"
                                  style={{ width: `${rel.strength * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}
      {activeTab === 'gap' && (
        <div className="space-y-6">
          {!gap ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mx-auto"></div>
                <p className="mt-4 text-gray-500">Analyzing skill gap...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Skill Gap Analysis for {skill.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-3xl font-bold text-emerald-600">{gap.userKnownSkills.length}</p>
                      <p className="text-sm text-emerald-700">Known Prerequisites</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-3xl font-bold text-yellow-600">
                        {gap.prerequisites.filter((p) => p.status === 'PARTIAL').length}
                      </p>
                      <p className="text-sm text-yellow-700">Partial Knowledge</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-3xl font-bold text-red-600">{gap.missingPrerequisites.length}</p>
                      <p className="text-sm text-red-700">Missing Prerequisites</p>
                    </div>
                  </div>

                  {gap.prerequisites.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Prerequisites Breakdown</h4>
                      <div className="space-y-3">
                        {gap.prerequisites.map((item): JSX.Element => (
                          <div
                            key={item.skill.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border border-gray-200 rounded-lg"
                          >
                            <Link href={`/skills/${item.skill.slug}`} className="flex items-center gap-3 flex-1">
                              <h4 className="font-medium text-gray-900">{item.skill.name}</h4>
                              <Badge variant="outline" className="capitalize text-xs">
                                {formatCategory(item.skill.category)}
                              </Badge>
                            </Link>
                            <div className="flex items-center gap-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getGapStatusBadge(item.status)}`}
                              >
                                {item.status}
                              </span>
                              {item.userProficiencyLevel && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.userProficiencyLevel}
                                </Badge>
                              )}
                              {item.requiredStrength && (
                                <span className="text-xs text-gray-500">
                                  Required: {Math.round(item.requiredStrength * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {gap.missingPrerequisites.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Missing Prerequisites
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      To develop proficiency in {skill.name}, consider learning these missing prerequisites first:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {gap.missingPrerequisites.map((item) => (
                        <Link key={item.skill.id} href={`/skills/${item.skill.slug}`} className="block">
                          <Badge variant="outline" className="capitalize">
                            {item.skill.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-6">
          {loadingConfidence ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : !confidenceData ? (
            <Card>
              <CardContent className="py-10 text-center space-y-3">
                <div className="text-3xl">📜</div>
                <h3 className="text-base font-bold text-gray-900">No Evidence Recorded Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  SkillSync hasn't analyzed evidence for this skill yet. Upload a resume or attach a project to establish verified skill confidence.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Link href="/resumes/new">
                    <Button size="sm">Upload Resume</Button>
                  </Link>
                  <Link href="/evidence">
                    <Button size="sm" variant="outline">Attach Evidence</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Conflict Warning Banner if conflicts exist */}
              {confidenceData.conflicts && confidenceData.conflicts.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <span>⚠️</span> Conflicting Evidence Detected
                  </div>
                  {confidenceData.conflicts.map((c, idx) => (
                    <div key={idx} className="text-xs text-rose-700 pl-6 space-y-0.5">
                      <p className="font-semibold">{c.message}</p>
                      <p className="text-[11px] text-rose-600 font-mono">{c.evidenceA} ⚡ {c.evidenceB}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Confidence & Verification Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Proficiency Level</span>
                    <h3 className="text-xl font-extrabold text-gray-900">{confidenceData.proficiency}</h3>
                    <span className="text-[10px] text-gray-400">User Claim / Assessed</span>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Confidence Score</span>
                      <span className="text-sm font-black text-primary-600">{confidenceData.confidence}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all duration-500 ${
                          confidenceData.confidence >= 75
                            ? 'bg-emerald-500'
                            : confidenceData.confidence >= 50
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${confidenceData.confidence}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 block pt-1">Multi-signal corroboration</span>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Verification State</span>
                    <div className="pt-0.5">
                      <Badge
                        variant="outline"
                        className={`font-bold text-xs ${
                          confidenceData.verificationStatus === 'VERIFIED' || confidenceData.verificationStatus === 'STRONGLY_SUPPORTED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : confidenceData.verificationStatus === 'SUPPORTED'
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : confidenceData.verificationStatus === 'CONFLICTING'
                            ? 'bg-rose-50 border-rose-300 text-rose-800'
                            : 'bg-amber-50 border-amber-300 text-amber-800'
                        }`}
                      >
                        {confidenceData.verificationStatus === 'VERIFIED'
                          ? '✓ Verified'
                          : confidenceData.verificationStatus === 'STRONGLY_SUPPORTED'
                          ? '✓ Strong Evidence'
                          : confidenceData.verificationStatus === 'SUPPORTED'
                          ? 'ℹ Supported'
                          : confidenceData.verificationStatus === 'CONFLICTING'
                          ? '⚠️ Conflicting'
                          : '⚠ Needs Verification'}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-gray-400 block">Trustworthiness tier</span>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Evidence Sources</span>
                    <h3 className="text-xl font-extrabold text-gray-900">{confidenceData.evidenceCount}</h3>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {confidenceData.evidenceSources.map((src, i) => (
                        <span key={i} className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                          {src}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Verifiable Evidence Items */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900">Traceable Evidence Records</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">Real document excerpts, project links, and test results</p>
                  </div>
                  <Link href="/resumes/new">
                    <Button size="sm" variant="outline" className="text-xs">
                      + Add More Evidence
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(!confidenceData.evidence || confidenceData.evidence.length === 0) ? (
                    <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                      No explicit evidence quotes recorded for this skill yet.
                    </div>
                  ) : (
                    confidenceData.evidence.map((ev) => (
                      <div key={ev.id} className="p-4 bg-white border border-gray-200/80 rounded-xl space-y-2 hover:border-primary-200 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-100 text-indigo-800 border-none font-semibold text-[10px]">
                              {ev.source}
                            </Badge>
                            <h4 className="text-sm font-bold text-gray-900">{ev.title}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-emerald-700">{ev.confidence}% signal</span>
                            {ev.createdAt && (
                              <span className="text-gray-400 text-[11px]">{new Date(ev.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        {ev.quote && (
                          <div className="p-3 bg-gray-50 rounded-lg border-l-3 border-primary-500 text-xs text-gray-700 font-serif italic">
                            "{ev.quote}"
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500 pt-1">
                          {ev.specificityScore && (
                            <span>Specificity: <strong className="text-gray-700">{(ev.specificityScore * 100).toFixed(0)}%</strong></span>
                          )}
                          {ev.recencyFactor && (
                            <span>Recency: <strong className="text-gray-700">{(ev.recencyFactor * 100).toFixed(0)}%</strong></span>
                          )}
                          {ev.url && (
                            <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                              View Source Artifact ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
      </div>
    </AppShell>
  );
}