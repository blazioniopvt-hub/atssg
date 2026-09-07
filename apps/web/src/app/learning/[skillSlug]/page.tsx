'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { skillGraphApi, learningApi } from '@/lib/api';
import { Skill, LearningPlanResult, LearningResourceSummary } from '@/lib/api';
import { GapItemComponent } from '@/components/learning/GapItem';
import { LearningMilestoneComponent } from '@/components/learning/LearningMilestone';
import { LearningResourceCard } from '@/components/learning/LearningResourceCard';
import { ReadinessBadge } from '@/components/learning/ReadinessBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Badge, Button } from '@skillsync/ui';

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      <p className="text-gray-600">Generating your personalized learning plan...</p>
    </div>
  );
}

function NoPlanState({ skill, onGenerate }: { skill: Skill; onGenerate: () => void }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-gray-600 mb-4">No learning plan available for this skill.</p>
        <Button variant="outline" onClick={onGenerate}>
          Generate Learning Plan
        </Button>
      </CardContent>
    </Card>
  );
}

function SkillHeader({ skill }: { skill: Skill }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">{skill.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge variant="outline" className="capitalize">{skill.category.replace('_', ' ').toLowerCase()}</Badge>
              <Badge variant="outline" className="capitalize">{skill.subcategory || 'General'}</Badge>
              {skill.demandLevel && (
                <Badge variant="outline">
                  {skill.demandLevel.toLowerCase()} demand
                </Badge>
              )}
              {skill.isVerified && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {skill.description && <p className="text-gray-600">{skill.description}</p>}
      </CardContent>
    </Card>
  );
}

function ReadinessSection({ readiness }: { readiness: 'READY' | 'PARTIAL' | 'FOUNDATION_REQUIRED' }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Readiness Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <ReadinessBadge readiness={readiness} size="lg" />
      </CardContent>
    </Card>
  );
}

function GapSummary({ learningPlan }: { learningPlan: LearningPlanResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Skill Gap Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{learningPlan.knownCount}</p>
              <p className="text-sm text-gray-500">Known</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{learningPlan.partialCount}</p>
              <p className="text-sm text-gray-500">Partial</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{learningPlan.missingCount}</p>
              <p className="text-sm text-gray-500">Missing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{learningPlan.foundationRequiredCount}</p>
              <p className="text-sm text-gray-500">Foundation Required</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function PrioritizedGaps({ gaps }: { gaps: Array<any> }) {
  if (gaps.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Prioritized Skill Gaps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {gaps.map((gap, index) => (
            <GapItemComponent key={gap.skill.id} item={gap} index={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LearningPathSection({ learningPath }: { learningPath: LearningPlanResult['learningPath'] }) {
  if (learningPath.milestones.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Learning Path</CardTitle>
          <Badge variant="outline" className={
            learningPath.estimatedDifficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
            learningPath.estimatedDifficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
            'bg-emerald-100 text-emerald-700'
          }>
            {learningPath.estimatedDifficulty} Difficulty
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {learningPath.milestones.map((milestone) => (
            <LearningMilestoneComponent key={milestone.skill.id} milestone={milestone} />
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          {learningPath.completedMilestones} of {learningPath.totalMilestones} milestones completed
        </div>
      </CardContent>
    </Card>
  );
}

function ResourcesSection({ resources }: { resources: Record<string, LearningResourceSummary[]> }) {
  const hasResources = Object.keys(resources).length > 0;
  if (!hasResources) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Learning Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No learning resources are currently available for this skill's prerequisites.</p>
            <p className="text-sm mt-2">The learning path is still valid - you can find resources through other channels.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Learning Resources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(resources).flatMap(([skillId, resourceList]) =>
            resourceList.map((resource) => (
              <LearningResourceCard key={resource.id} resource={resource} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LearningPlanContent({ learningPlan, skill, onGenerate }: { 
  learningPlan: LearningPlanResult; 
  skill: Skill;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-8">
      <SkillHeader skill={skill} />
      <ReadinessSection readiness={learningPlan.readiness} />
      <GapSummary learningPlan={learningPlan} />
      <PrioritizedGaps gaps={learningPlan.prioritizedGaps} />
      <LearningPathSection learningPath={learningPlan.learningPath} />
      <ResourcesSection resources={learningPlan.resources} />
    </div>
  );
}

export default function LearningSkillPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const skillSlug = params.skillSlug as string;

  const [skill, setSkill] = useState<Skill | null>(null);
  const [learningPlan, setLearningPlan] = useState<LearningPlanResult | null>(null);
  const [isLoadingSkill, setIsLoadingSkill] = useState(true);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkill = async () => {
    try {
      setIsLoadingSkill(true);
      const res = await skillGraphApi.getSkill(skillSlug);
      setSkill(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Skill not found');
      setSkill(null);
    } finally {
      setIsLoadingSkill(false);
    }
  };

  const fetchLearningPlan = async (skillId: string) => {
    try {
      setIsLoadingPlan(true);
      setError(null);
      const res = await learningApi.getPlan(skillId);
      setLearningPlan(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learning plan');
      setLearningPlan(null);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && skillSlug) {
      fetchSkill();
    }
  }, [user, skillSlug]);

  useEffect(() => {
    if (skill) {
      fetchLearningPlan(skill.id);
    }
  }, [skill]);

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

  if (isLoadingSkill) {
    return (
      <AppShell>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      </AppShell>
    );
  }

  if (error && !skill) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link href="/learning" className="text-xs text-primary-600 font-semibold hover:underline">
            ← Back to Learning Paths
          </Link>
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            The skill "{skillSlug}" could not be loaded: {error}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!skill) {
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Link href="/learning" className="text-xs text-primary-600 font-semibold hover:underline mb-2 inline-block">
            ← Back to Learning Paths
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{skill.name} Learning Path</h1>
          <p className="text-sm text-gray-500">Prerequisite skill gaps, topological milestones, and recommended resources</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {learningPlan ? (
          <LearningPlanContent learningPlan={learningPlan} skill={skill} onGenerate={() => fetchLearningPlan(skill.id)} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              {isLoadingPlan ? <LoadingSpinner /> : <NoPlanState skill={skill} onGenerate={() => fetchLearningPlan(skill.id)} />}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}