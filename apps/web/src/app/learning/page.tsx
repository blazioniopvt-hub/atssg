'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import {
  learningPathApi,
  targetRoleApi,
  assessmentApi,
  resourceDiscoveryApi,
  LearningPathDTO,
  LearningPathItemDTO,
  ResourceRecommendationDTO,
  TargetRole,
  Assessment,
  AssessmentResult,
  ResourceDiscoveryResult,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Badge, Button } from '@skillsync/ui';

export default function LearningPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [path, setPath] = useState<LearningPathDTO | null>(null);
  const [targetRoles, setTargetRoles] = useState<TargetRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<TargetRole | null>(null);
  const [recommendations, setRecommendations] = useState<ResourceRecommendationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'path' | 'resources' | 'assessments'>('path');
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [discoveredResources, setDiscoveredResources] = useState<ResourceDiscoveryResult | null>(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const loadLearningData = async (roleId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch user's target roles
      const [rolesRes, pathRes, recsRes] = await Promise.all([
        targetRoleApi.listRoles().catch(() => ({ data: [] })),
        learningPathApi.getPath(roleId).catch(() => ({ data: null })),
        learningPathApi.getRecommendations().catch(() => ({ data: [] })),
      ]);

      setTargetRoles(rolesRes.data || []);
      if (pathRes.data) {
        setPath(pathRes.data);
        const matchingRole = (rolesRes.data || []).find((r: TargetRole) => r.id === pathRes.data.targetRoleId || r.slug === pathRes.data.targetRoleSlug);
        setSelectedRole(matchingRole || null);

        // Auto-expand first in-progress or available item
        const focusItem = pathRes.data.items.find(it => it.status === 'IN_PROGRESS') ||
          pathRes.data.items.find(it => it.status === 'AVAILABLE');
        if (focusItem) {
          setExpandedItemId(focusItem.id);
        }
      }
      setRecommendations(recsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load personalized learning path');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadLearningData();
    }
  }, [user]);

  const handleStartItem = async (itemId: string) => {
    try {
      setIsActionLoading(true);
      const res = await learningPathApi.startItem(itemId);
      if (path) {
        const updatedItems = path.items.map(it => it.id === itemId ? res.data : it);
        const inProgressCount = updatedItems.filter(it => it.status === 'IN_PROGRESS').length;
        const totalProgress = Math.round(updatedItems.reduce((acc, it) => acc + (it.progress || 0), 0) / updatedItems.length);
        setPath({ ...path, items: updatedItems, inProgressItems: inProgressCount, progress: totalProgress });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start milestone');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateProgress = async (itemId: string, newProgress: number) => {
    try {
      setIsActionLoading(true);
      const res = await learningPathApi.updateProgress(itemId, newProgress);
      if (path) {
        // Reload path to get any unlocked items if completed
        const refreshed = await learningPathApi.getPath(path.targetRoleId);
        setPath(refreshed.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update progress');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    try {
      setIsActionLoading(true);
      await learningPathApi.completeItem(itemId);
      // Reload full path to reflect unlocked downstream items
      if (path) {
        const refreshed = await learningPathApi.getPath(path.targetRoleId);
        setPath(refreshed.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete milestone');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSkipItem = async (itemId: string) => {
    try {
      setIsActionLoading(true);
      const res = await learningPathApi.skipItem(itemId);
      if (path) {
        const updatedItems = path.items.map(it => it.id === itemId ? res.data : it);
        setPath({ ...path, items: updatedItems });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to skip milestone');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRegeneratePath = async () => {
    if (!path) return;
    if (!confirm('Regenerate learning path? Your completed milestones and historical progress will be strictly preserved.')) {
      return;
    }
    try {
      setIsLoading(true);
      const res = await learningPathApi.regeneratePath(path.id);
      setPath(res.data);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate learning path');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (newRoleId: string) => {
    try {
      setIsLoading(true);
      const res = await learningPathApi.generatePath(newRoleId);
      setPath(res.data);
      const matchingRole = targetRoles.find(r => r.id === newRoleId);
      setSelectedRole(matchingRole || null);
    } catch (err: any) {
      alert(err.message || 'Failed to switch target role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeAssessment = async (skillId: string, learningPathItemId?: string) => {
    try {
      setIsActionLoading(true);
      setAssessmentResult(null);
      setAssessmentAnswers({});
      const res = await assessmentApi.createAssessment(skillId, 'QUIZ', learningPathItemId);
      const started = await assessmentApi.startAssessment(res.data.id);
      setActiveAssessment(started.data);
      setActiveTab('assessments');
    } catch (err: any) {
      alert(err.message || 'Failed to start assessment');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!activeAssessment) return;
    try {
      setIsActionLoading(true);
      const res = await assessmentApi.submitAssessment(activeAssessment.id, assessmentAnswers);
      setAssessmentResult(res.data);
      setActiveAssessment({ ...activeAssessment, status: 'GRADED' });
      // Refresh learning path to reflect any unlocked items
      if (path) {
        try {
          const refreshed = await learningPathApi.getPath(path.targetRoleId);
          setPath(refreshed.data);
        } catch { /* ignore */ }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit assessment');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDiscoverResources = async (skillId: string) => {
    try {
      setIsActionLoading(true);
      const res = await resourceDiscoveryApi.discoverResources(skillId);
      setDiscoveredResources(res.data);
    } catch (err: any) {
      alert(err.message || 'Failed to discover resources');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Assembling your personalized learning roadmap...</p>
        </div>
      </AppShell>
    );
  }

  const currentFocus = path?.items.find(it => it.status === 'IN_PROGRESS') ||
    path?.items.find(it => it.status === 'AVAILABLE');

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header with Target Role Context */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                  Personalized Roadmap
                </Badge>
                <Badge variant="outline" className="text-gray-600">
                  Phase 6 Intelligence
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {path?.targetRoleTitle || selectedRole?.title || 'Target Role'} Learning Path
              </h1>
              <p className="text-gray-600 text-sm mt-1 max-w-2xl">
                Deterministic developmental milestones addressing verified proficiency gaps and evidence deficits for your selected career objective.
              </p>
            </div>

            {/* Role Switcher & Regeneration */}
            <div className="flex flex-wrap items-center gap-3">
              {targetRoles.length > 0 && (
                <select
                  value={path?.targetRoleId || ''}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="text-sm font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {targetRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.title}
                    </option>
                  ))}
                </select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegeneratePath}
                disabled={isActionLoading}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                ↻ Adaptive Recalculation
              </Button>
            </div>
          </div>

          {/* Progress Banner */}
          {path && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">Roadmap Completion</span>
                <span className="text-sm font-bold text-indigo-600">{path.progress}% Completed</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${path.progress}%` }}
                />
              </div>

              {/* Metric counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-2">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">{path.completedItems} / {path.totalItems}</div>
                  <div className="text-xs text-gray-500 font-medium">Milestones Done</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-indigo-600">{path.inProgressItems}</div>
                  <div className="text-xs text-gray-500 font-medium">Active in Progress</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-600">
                    {path.items.filter(it => it.status === 'LOCKED').length}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">Prerequisite Locked</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600">
                    ~{Math.round(path.estimatedTotalMinutes / 60)}h
                  </div>
                  <div className="text-xs text-gray-500 font-medium">Estimated Effort</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current Focus Highlight Card */}
        {currentFocus && (
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-xl p-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                    🎯 Current Focus Objective
                  </span>
                  <span className="text-xs text-indigo-200 uppercase font-medium tracking-wider">
                    {currentFocus.skillName} • Priority {currentFocus.priority}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{currentFocus.title}</h2>
                <p className="text-indigo-100 text-sm max-w-3xl leading-relaxed">
                  {currentFocus.objective}
                </p>

                {currentFocus.resource && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs text-indigo-300">Recommended Resource:</span>
                    <a
                      href={currentFocus.resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-white underline hover:text-indigo-200 inline-flex items-center gap-1"
                    >
                      {currentFocus.resource.title} ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Progress & Quick Action */}
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <div className="text-center sm:text-right">
                  <div className="text-2xl font-black text-white">{currentFocus.progress}%</div>
                  <div className="text-xs text-indigo-200">Current Progress</div>
                </div>
                {currentFocus.status === 'AVAILABLE' ? (
                  <Button
                    onClick={() => handleStartItem(currentFocus.id)}
                    disabled={isActionLoading}
                    className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-5"
                  >
                    Start Milestone
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateProgress(currentFocus.id, Math.min(100, currentFocus.progress + 25))}
                      disabled={isActionLoading || currentFocus.progress >= 100}
                      className="bg-indigo-700/50 text-white border-indigo-400/40 hover:bg-indigo-700"
                    >
                      +25% Progress
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCompleteItem(currentFocus.id)}
                      disabled={isActionLoading}
                      className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold"
                    >
                      ✓ Complete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('path')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'path'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ordered Learning Roadmap ({path?.items.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'resources'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Curated Resources & Explainability ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'assessments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Skill Assessments {activeAssessment ? '●' : ''}
          </button>
        </div>

        {/* Tab 1: Ordered Learning Roadmap */}
        {activeTab === 'path' && path && (
          <div className="space-y-4">
            {path.items.map((item: LearningPathItemDTO, index: number) => {
              const isExpanded = expandedItemId === item.id;
              const isLocked = item.status === 'LOCKED';
              const isCompleted = item.status === 'COMPLETED';
              const isInProgress = item.status === 'IN_PROGRESS';

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl transition-all shadow-sm ${
                    isInProgress
                      ? 'border-indigo-500 ring-2 ring-indigo-100'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isLocked
                      ? 'border-gray-200 opacity-75'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    className="w-full text-left p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-transparent border-0"
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Number or Status Icon */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isInProgress
                            ? 'bg-indigo-600 text-white'
                            : isLocked
                            ? 'bg-gray-200 text-gray-500'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {isCompleted ? '✓' : isLocked ? '🔒' : index + 1}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{item.skillName}</span>
                          <Badge
                            variant="outline"
                            className={
                              item.priority === 'HIGH'
                                ? 'bg-red-50 text-red-700 border-red-200 text-xs'
                                : item.priority === 'MEDIUM'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 text-xs'
                                : 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
                            }
                          >
                            {item.priority} Priority
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold'
                                : isInProgress
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold'
                                : isLocked
                                ? 'bg-gray-100 text-gray-600 border-gray-200 text-xs'
                                : 'bg-purple-50 text-purple-700 border-purple-200 text-xs'
                            }
                          >
                            {item.status.replace('_', ' ')}
                          </Badge>
                          {item.confidence !== undefined && (
                            <span className="text-xs text-gray-500">
                              Confidence: {item.confidence}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{item.title}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{item.progress}%</div>
                        <div className="text-xs text-gray-500">~{Math.round(item.estimatedMinutes / 60)}h effort</div>
                      </div>
                      <span className="text-gray-400 font-bold text-lg">
                        {isExpanded ? '▴' : '▾'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Item Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-4">
                      {/* Concrete Objective */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Capability Learning Objective
                        </h4>
                        <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                          {item.objective}
                        </p>
                      </div>

                      {/* Prerequisites Section */}
                      {item.prerequisites && item.prerequisites.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Graph Prerequisites
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {item.prerequisites.map(p => (
                              <span
                                key={p.id}
                                className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                                  p.isSatisfied
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-red-50 text-red-700 border-red-200 font-medium'
                                }`}
                              >
                                {p.isSatisfied ? '✓' : '⚠'} {p.name} ({p.isSatisfied ? 'Satisfied' : 'Pending'})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attached Learning Resource Card with Explainability */}
                      {item.resource && (
                        <div className="border border-indigo-100 bg-indigo-50/40 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <div>
                              <span className="text-xs font-semibold text-indigo-700 uppercase">
                                Recommended Resource • {item.resource.type}
                              </span>
                              <h5 className="font-bold text-gray-900 text-sm">{item.resource.title}</h5>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Provider: {item.resource.provider || 'Verified Partner'} • Difficulty: {item.resource.difficulty || 'Intermediate'} • Rating: {item.resource.rating || 4.8} / 5.0
                              </p>
                            </div>
                            <a
                              href={item.resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shrink-0"
                            >
                              Open Resource ↗
                            </a>
                          </div>

                          {/* Explainability Breakdown */}
                          {item.explanation && item.explanation.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-indigo-100/70">
                              <span className="text-xs font-bold text-indigo-900 block mb-1">
                                Why SkillSync recommended this milestone:
                              </span>
                              <ul className="text-xs text-gray-700 space-y-1">
                                {item.explanation.map((reason: string, rIdx: number) => (
                                  <li key={rIdx} className="flex items-start gap-1.5">
                                    <span className="text-indigo-600 font-bold">•</span>
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {!isLocked && !isCompleted && (
                            <>
                              {isInProgress ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateProgress(item.id, Math.min(100, item.progress + 25))}
                                    disabled={isActionLoading}
                                  >
                                    +25% Progress
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleCompleteItem(item.id)}
                                    disabled={isActionLoading}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                  >
                                    Mark as Complete
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartItem(item.id)}
                                  disabled={isActionLoading}
                                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                  Start Milestone
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTakeAssessment(item.skillId, item.id)}
                                disabled={isActionLoading}
                                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                              >
                                📝 Take Assessment
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDiscoverResources(item.skillId)}
                                disabled={isActionLoading}
                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              >
                                🔍 Find Resources
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSkipItem(item.id)}
                                disabled={isActionLoading}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                Skip
                              </Button>
                            </>
                          )}
                          {isLocked && (
                            <span className="text-xs text-amber-700 font-medium">
                              🔒 Complete prerequisite skills above to unlock this milestone.
                            </span>
                          )}
                          {isCompleted && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                ✓ Milestone verified and completed
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTakeAssessment(item.skillId, item.id)}
                                disabled={isActionLoading}
                                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 text-xs"
                              >
                                📝 Retake Assessment
                              </Button>
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/skills/${item.skillSlug}`}
                          className="text-xs text-indigo-600 hover:underline font-medium"
                        >
                          View Skill & Evidence Detail →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Curated Resources Grid */}
        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((rec, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 mb-2">
                        {rec.resource.type}
                      </Badge>
                      <CardTitle className="text-base font-bold text-gray-900 leading-snug">
                        {rec.resource.title}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        Provider: {rec.resource.provider || 'Curated Source'} • Difficulty: {rec.resource.difficulty || 'Intermediate'}
                      </p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold shrink-0">
                      Score: {rec.score}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rec.resource.description && (
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {rec.resource.description}
                    </p>
                  )}

                  {/* Explainability reasons */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-xs font-bold text-gray-700 block mb-1">
                      Why Recommended:
                    </span>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {rec.explanation.map((exp, eIdx) => (
                        <li key={eIdx} className="flex items-start gap-1">
                          <span className="text-indigo-600 font-bold">✓</span>
                          <span>{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">
                      Duration: ~{Math.round((rec.resource.durationMinutes || 120) / 60)} hours
                    </span>
                    <a
                      href={rec.resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      Open Resource ↗
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tab 3: Skill Assessments */}
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            {!activeAssessment ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Skill Assessments</h3>
                <p className="text-sm text-gray-600 mb-6 max-w-lg mx-auto">
                  Take assessments to validate your skills and earn verified evidence. Assessment results feed back into your confidence score and may unlock new learning path items.
                </p>
                {path && path.items.filter(it => it.status === 'IN_PROGRESS' || it.status === 'AVAILABLE').length > 0 && (
                  <div className="space-y-3 max-w-md mx-auto">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Assessments</p>
                    {path.items
                      .filter(it => it.status === 'IN_PROGRESS' || it.status === 'AVAILABLE')
                      .slice(0, 5)
                      .map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{item.skillName}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                              item.priority === 'HIGH' ? 'bg-red-50 text-red-700' : item.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                            }`}>{item.priority}</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleTakeAssessment(item.skillId, item.id)}
                            disabled={isActionLoading}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs"
                          >
                            Take Quiz
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : assessmentResult ? (
              /* Assessment Results View */
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">{assessmentResult.passed ? '🎉' : '📚'}</div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {assessmentResult.skillName} Assessment — {assessmentResult.passed ? 'Passed!' : 'Keep Learning'}
                  </h3>
                  <div className="mt-3 flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-black ${assessmentResult.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {assessmentResult.percentage}%
                      </div>
                      <div className="text-xs text-gray-500">Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-indigo-600">
                        {assessmentResult.score}/{assessmentResult.maxScore}
                      </div>
                      <div className="text-xs text-gray-500">Points</div>
                    </div>
                  </div>
                </div>

                {/* Confidence Impact */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-indigo-900 mb-2">Confidence Impact</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">{assessmentResult.confidenceImpact.previousConfidence}%</span>
                    <span className="text-indigo-600 font-bold">→</span>
                    <span className="text-sm font-bold text-indigo-700">{assessmentResult.confidenceImpact.newConfidence}%</span>
                    {assessmentResult.confidenceImpact.delta > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        +{assessmentResult.confidenceImpact.delta}%
                      </span>
                    )}
                  </div>
                  {assessmentResult.pathAdaptation.masteryAchieved && (
                    <p className="text-xs text-emerald-700 mt-2 font-medium">✓ Mastery threshold reached — learning path updated</p>
                  )}
                </div>

                {/* Per-Question Feedback */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-800">Question Breakdown</h4>
                  {assessmentResult.feedback.map((fb) => (
                    <div
                      key={fb.questionId}
                      className={`p-3 rounded-lg border text-sm ${
                        fb.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold ${fb.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                          Q{fb.questionNumber}: {fb.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      </div>
                      {!fb.isCorrect && (
                        <p className="text-xs text-gray-700">
                          <strong>Correct answer:</strong> {fb.correctAnswer}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">{fb.explanation}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setActiveAssessment(null);
                      setAssessmentResult(null);
                      setAssessmentAnswers({});
                    }}
                    className="bg-gray-100 text-gray-800 hover:bg-gray-200"
                  >
                    Back to Assessments
                  </Button>
                  <Button
                    onClick={() => setActiveTab('path')}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    View Learning Path
                  </Button>
                </div>
              </div>
            ) : (
              /* Active Assessment — Questions */
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{activeAssessment.title}</h3>
                    <p className="text-sm text-gray-600">{activeAssessment.description}</p>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    {activeAssessment.questions.length} Questions
                  </Badge>
                </div>

                <div className="space-y-5">
                  {activeAssessment.questions.map((q) => (
                    <div key={q.id} className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {q.questionNumber}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{q.text}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-gray-500">{q.skillArea}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{q.difficulty}</span>
                          </div>
                        </div>
                      </div>

                      {q.choices && (
                        <div className="space-y-2 ml-10">
                          {q.choices.map((choice, cIdx) => (
                            <label
                              key={cIdx}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                                assessmentAnswers[q.id] === choice
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={choice}
                                checked={assessmentAnswers[q.id] === choice}
                                onChange={() => setAssessmentAnswers(prev => ({ ...prev, [q.id]: choice }))}
                                className="accent-indigo-600"
                              />
                              {choice}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveAssessment(null);
                      setAssessmentAnswers({});
                    }}
                    className="text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitAssessment}
                    disabled={isActionLoading || Object.keys(assessmentAnswers).length === 0}
                    className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold"
                  >
                    {isActionLoading ? 'Grading...' : 'Submit Assessment'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resource Discovery Panel */}
        {discoveredResources && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Discovered Resources for {discoveredResources.skillName}
              </h3>
              <button
                onClick={() => setDiscoveredResources(null)}
                className="text-sm text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Found {discoveredResources.totalFound} curated resources
            </p>
            <div className="grid gap-3">
              {discoveredResources.resources.map(res => (
                <div key={res.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{res.title}</span>
                      {res.verifiedSource && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">✓ Verified</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {res.provider} • {res.type} • {res.difficulty} • ~{Math.round((res.durationMinutes || 60) / 60)}h
                    </p>
                  </div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 shrink-0 ml-3"
                  >
                    Open ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}