'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { skillIntelligenceApi, resumeApi, targetRoleApi, learningPathApi, SkillIntelligenceSummary, TargetRole, TargetRoleGapResult, LearningPathSummaryDTO } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@skillsync/ui';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<SkillIntelligenceSummary | null>(null);
  const [resumes, setResumes] = useState<{ id: string; originalFilename: string; createdAt: string }[]>([]);
  const [targetRoleData, setTargetRoleData] = useState<{ targetRole: TargetRole | null; gap: TargetRoleGapResult | null }>({ targetRole: null, gap: null });
  const [availableRoles, setAvailableRoles] = useState<TargetRole[]>([]);
  const [learningSummary, setLearningSummary] = useState<LearningPathSummaryDTO | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [sumRes, resumeRes, targetRoleRes, rolesListRes, learnRes] = await Promise.allSettled([
        skillIntelligenceApi.getSummary(),
        resumeApi.list(),
        targetRoleApi.getUserTargetRole(),
        targetRoleApi.listRoles(),
        learningPathApi.getDashboardSummary(),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value?.data) {
        setSummary(sumRes.value.data);
      }
      if (resumeRes.status === 'fulfilled' && resumeRes.value?.data?.resumes) {
        setResumes(resumeRes.value.data.resumes);
      }
      if (targetRoleRes.status === 'fulfilled' && targetRoleRes.value?.data) {
        setTargetRoleData(targetRoleRes.value.data);
      }
      if (rolesListRes.status === 'fulfilled' && rolesListRes.value?.data) {
        setAvailableRoles(rolesListRes.value.data);
      }
      if (learnRes.status === 'fulfilled' && learnRes.value?.data) {
        setLearningSummary(learnRes.value.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const handleSelectTargetRole = async (roleId: string) => {
    if (!roleId) return;
    setUpdatingRole(true);
    setRoleError(null);
    try {
      const res = await targetRoleApi.setTargetRole(roleId);
      if (res?.data) {
        setTargetRoleData({ targetRole: res.data.role || res.role || null, gap: res.data });
      }
    } catch (e: any) {
      console.error('Failed to set target role:', e);
      setRoleError(e.message || 'Failed to update target role');
    } finally {
      setUpdatingRole(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, router, loadDashboardData]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
      </main>
    );
  }

  const displayName = user?.displayName || user?.username || user?.email || 'User';

  return (
    <AppShell>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <Badge className="bg-white/20 text-white border-none backdrop-blur-xs text-xs font-semibold px-3 py-1">
            SkillSync SaaS Dashboard
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {displayName}!
          </h1>
          <p className="text-primary-100 text-sm sm:text-base leading-relaxed">
            Track your skill profile, verify project evidence, parse resumes with AI, and map your optimal career learning path.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent hidden lg:block" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold shrink-0">
              🎯
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Skills</p>
              <h3 className="text-2xl font-black text-gray-900">{loadingData ? '...' : summary?.totalSkills || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold shrink-0">
              ⚡
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Verified Skills</p>
              <h3 className="text-2xl font-black text-gray-900">{loadingData ? '...' : summary?.verifiedSkillsCount || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold shrink-0">
              📜
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resumes Uploaded</p>
              <h3 className="text-2xl font-black text-gray-900">{loadingData ? '...' : resumes.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold shrink-0">
              📈
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Confidence</p>
              <h3 className="text-2xl font-black text-gray-900">{loadingData ? '...' : `${summary?.averageConfidence || 0}%`}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/skills" className="block">
            <Button variant="outline" className="w-full justify-center gap-2 text-xs sm:text-sm py-2.5">
              <span>➕</span> Add Skill
            </Button>
          </Link>
          <Link href="/evidence" className="block">
            <Button variant="outline" className="w-full justify-center gap-2 text-xs sm:text-sm py-2.5">
              <span>📜</span> Attach Evidence
            </Button>
          </Link>
          <Link href="/resumes/new" className="block">
            <Button variant="outline" className="w-full justify-center gap-2 text-xs sm:text-sm py-2.5">
              <span>📄</span> Upload Resume
            </Button>
          </Link>
          <Link href="/learning" className="block">
            <Button variant="outline" className="w-full justify-center gap-2 text-xs sm:text-sm py-2.5">
              <span>🗺️</span> Learning Paths
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Skill Breakdown & Recent Resumes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Skills Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-900">Top Verified Skills</CardTitle>
              <Link href="/skills" className="text-xs text-primary-600 font-semibold hover:underline">
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="py-8 text-center text-gray-400">Loading skill profiles...</div>
              ) : !summary?.topSkills || summary.topSkills.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500 font-medium mb-3">No skills added to your profile yet.</p>
                  <Link href="/skills">
                    <Button size="sm">Add Your First Skill</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.topSkills.map((item, idx) => {
                    const confidenceVal = Math.round(
                      (typeof item.userSkill?.confidence === 'number' && item.userSkill.confidence > 0)
                        ? item.userSkill.confidence
                        : (item.intelligence?.score || 0) * 100
                    );
                    const vStatus = (item.userSkill?.verificationStatus || 'UNVERIFIED').toUpperCase();
                    return (
                      <Link
                        key={item.skill?.id || item.userSkill?.id || idx}
                        href={`/skills/${item.skill?.slug || item.skill?.id || ''}`}
                        className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-xl shadow-2xs hover:border-primary-300 hover:shadow-xs transition-all group block"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 font-extrabold text-sm flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                            {item.skill.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-primary-600 transition-colors">
                              {item.skill.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500 font-medium capitalize">
                                {item.userSkill.proficiencyLevel.toLowerCase()}
                              </span>
                              {item.evidenceCount > 0 && (
                                <span className="text-[10px] text-gray-400">
                                  • {item.evidenceCount} evidence source{item.evidenceCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right w-24">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs font-black text-gray-900">{confidenceVal}%</span>
                              <span className="text-[10px] text-gray-400">confidence</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full transition-all ${
                                  confidenceVal >= 75
                                    ? 'bg-emerald-500'
                                    : confidenceVal >= 50
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${confidenceVal}%` }}
                              />
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold shrink-0 ${
                              vStatus === 'VERIFIED' || vStatus === 'STRONGLY_SUPPORTED'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : vStatus === 'SUPPORTED'
                                ? 'bg-blue-50 border-blue-300 text-blue-800'
                                : vStatus === 'CONFLICTING'
                                ? 'bg-rose-50 border-rose-300 text-rose-800'
                                : 'bg-amber-50 border-amber-300 text-amber-800'
                            }`}
                          >
                            {vStatus === 'VERIFIED' || vStatus === 'STRONGLY_SUPPORTED'
                              ? '✓ Strong evidence'
                              : vStatus === 'SUPPORTED'
                              ? 'ℹ Limited evidence'
                              : vStatus === 'CONFLICTING'
                              ? '⚠️ Conflicting'
                              : '⚠ Needs verification'}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Resumes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-900">Recent Resumes</CardTitle>
              <Link href="/resumes/new" className="text-xs text-primary-600 font-semibold hover:underline">
                Upload New →
              </Link>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="py-6 text-center text-gray-400">Loading resumes...</div>
              ) : resumes.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500 font-medium mb-3">No resumes uploaded yet.</p>
                  <Link href="/resumes/new">
                    <Button size="sm" variant="outline">Upload Resume for AI Parsing</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.slice(0, 3).map((res) => (
                    <div key={res.id} className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-xl shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
                          📄
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[200px] sm:max-w-xs">{res.originalFilename}</h4>
                          <span className="text-xs text-gray-400">{new Date(res.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link href={`/resumes/${res.id}/analyze`}>
                        <Button size="sm" variant="ghost" className="text-xs text-primary-600">
                          View Analysis →
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Target Role Intelligence & Account Overview */}
        <div className="space-y-6">
          {/* Target Role Readiness Card */}
          <Card className="border-primary-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">Target Role Intelligence</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Deterministic skill gap analysis</p>
              </div>
              {targetRoleData.gap && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    (targetRoleData.gap.readinessScore ?? targetRoleData.gap.readinessPercentage) >= 80
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : (targetRoleData.gap.readinessScore ?? targetRoleData.gap.readinessPercentage) >= 50
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-rose-300 bg-rose-50 text-rose-700'
                  }`}
                >
                  {targetRoleData.gap.readinessLevel ? targetRoleData.gap.readinessLevel.replace('_', ' ') : 'ACTIVE'}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {roleError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {roleError}
                </div>
              )}

              <div>
                <label htmlFor="target-role-select" className="block text-xs font-semibold text-gray-600 mb-1">
                  Select Target Career Role
                </label>
                <select
                  id="target-role-select"
                  disabled={updatingRole}
                  value={targetRoleData.targetRole?.id || ''}
                  onChange={(e) => handleSelectTargetRole(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:bg-white focus:border-primary-500 focus:outline-hidden"
                >
                  <option value="">-- Choose Target Career Role --</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.category})
                    </option>
                  ))}
                </select>
                {updatingRole && (
                  <p className="text-[11px] text-primary-600 font-medium mt-1 flex items-center gap-1.5 animate-pulse">
                    <span>⚡</span> Computing real-time gap analysis...
                  </p>
                )}
              </div>

              {targetRoleData.gap ? (
                <div className="space-y-4 pt-1">
                  {/* Readiness Scores Block */}
                  <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700">Overall Readiness</span>
                      <span className="font-black text-primary-700 text-sm">
                        {targetRoleData.gap.readinessScore ?? targetRoleData.gap.readinessPercentage}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (targetRoleData.gap.readinessScore ?? targetRoleData.gap.readinessPercentage) >= 80
                            ? 'bg-emerald-500'
                            : (targetRoleData.gap.readinessScore ?? targetRoleData.gap.readinessPercentage) >= 50
                            ? 'bg-amber-500'
                            : 'bg-primary-600'
                        }`}
                        style={{
                          width: `${targetRoleData.gap.readinessScore ?? targetRoleData.gap.readinessPercentage}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <span className="text-gray-500 font-medium">Mandatory Skills Readiness:</span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          targetRoleData.gap.mandatoryReadinessScore >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : targetRoleData.gap.mandatoryReadinessScore >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {targetRoleData.gap.mandatoryReadinessScore}%
                      </span>
                    </div>

                    {typeof targetRoleData.gap.averageSkillConfidence === 'number' && targetRoleData.gap.averageSkillConfidence > 0 && (
                      <div className="flex justify-between items-center pt-1.5 text-[11px] border-t border-gray-200/60 mt-2">
                        <span className="text-gray-500 font-medium">Role Skill Confidence:</span>
                        <span className="font-bold text-indigo-700">
                          {targetRoleData.gap.averageSkillConfidence}% ({targetRoleData.gap.evidenceBackedSkillsCount || 0} evidence-backed)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 4-Stat Requirement Grid */}
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="block text-xs font-bold text-emerald-700">
                        {targetRoleData.gap.summary?.matchedCount ?? targetRoleData.gap.matchedCount ?? 0}
                      </span>
                      <span className="text-[9px] font-medium text-emerald-600 uppercase tracking-tight">Matched</span>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                      <span className="block text-xs font-bold text-amber-700">
                        {targetRoleData.gap.summary?.partialCount ?? targetRoleData.gap.partialCount ?? 0}
                      </span>
                      <span className="text-[9px] font-medium text-amber-600 uppercase tracking-tight">Partial</span>
                    </div>
                    <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                      <span className="block text-xs font-bold text-rose-700">
                        {targetRoleData.gap.summary?.missingCount ?? targetRoleData.gap.missingCount ?? 0}
                      </span>
                      <span className="text-[9px] font-medium text-rose-600 uppercase tracking-tight">Missing</span>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                      <span className="block text-xs font-bold text-purple-700">
                        {targetRoleData.gap.summary?.mandatoryMissingCount ?? 0}
                      </span>
                      <span className="text-[9px] font-medium text-purple-600 uppercase tracking-tight">Mandatory</span>
                    </div>
                  </div>

                  {/* Top Priorities List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Top Priorities to Learn</h4>
                      <span className="text-[10px] text-gray-400">Ranked by impact</span>
                    </div>

                    {(!targetRoleData.gap.priorities || targetRoleData.gap.priorities.length === 0) ? (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center text-xs text-emerald-700 font-semibold">
                        🎉 All role requirements matched!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {targetRoleData.gap.priorities.slice(0, 4).map((p, idx) => (
                          <div
                            key={p.skill.id || idx}
                            className="p-2.5 bg-white border border-gray-200 rounded-lg text-xs space-y-1 hover:border-primary-300 transition-colors shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900">
                                {idx + 1}. {p.skill.name}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 ${
                                  p.isRequired
                                    ? 'border-rose-300 bg-rose-50 text-rose-700 font-bold'
                                    : 'border-blue-200 bg-blue-50 text-blue-700'
                                }`}
                              >
                                {p.isRequired ? 'Mandatory' : 'Optional'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-gray-500">{p.reason}</p>
                            {p.suggestedAction && (
                              <p className="text-[10px] text-primary-700 font-medium flex items-center gap-1">
                                <span>🎯</span> {p.suggestedAction}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link href="/learning" className="block pt-1">
                    <Button size="sm" variant="outline" className="w-full text-xs justify-center gap-1">
                      View Targeted Skill Gap Analysis →
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Select a target role above to evaluate skill gaps and readiness.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 5: Personalized Learning Roadmap Card */}
          <Card className="border-indigo-100 shadow-sm bg-gradient-to-br from-white to-indigo-50/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                    Phase 5 Intelligence
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-gray-900">Personalized Learning Roadmap</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  {learningSummary?.targetRoleTitle || targetRoleData.targetRole?.title || 'Target Role'} developmental path
                </p>
              </div>
              <Link href="/learning" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All →
              </Link>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              {learningSummary ? (
                <>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-gray-700">Roadmap Progress</span>
                      <span className="font-bold text-indigo-600">{learningSummary.progress}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all"
                        style={{ width: `${learningSummary.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                      <span>{learningSummary.completedItems} of {learningSummary.totalItems} milestones done</span>
                      <span>{learningSummary.highPriorityGapsCount} high-priority gaps</span>
                    </div>
                  </div>

                  {learningSummary.currentFocus && (
                    <div className="p-3 bg-white border border-indigo-100 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
                        Current Focus Objective
                      </span>
                      <h4 className="text-xs font-bold text-gray-900">{learningSummary.currentFocus.title}</h4>
                      <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
                        {learningSummary.currentFocus.objective}
                      </p>
                    </div>
                  )}

                  <Link href="/learning" className="block">
                    <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                      Continue Learning Roadmap →
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500 mb-3">Set a target role to generate your adaptive learning path.</p>
                  <Link href="/learning">
                    <Button size="sm" variant="outline" className="text-xs">
                      Generate Learning Path
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-900">Account Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{displayName}</h4>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <dt className="text-gray-500 font-medium">Role</dt>
                  <dd className="font-semibold text-gray-900 uppercase">{user?.role || 'USER'}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <dt className="text-gray-500 font-medium">Account Status</dt>
                  <dd className="font-semibold text-emerald-600 uppercase">{user?.status}</dd>
                </div>
              </dl>

              <div className="pt-2 space-y-2">
                <Link href="/profile" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    Edit Profile Details
                  </Button>
                </Link>
                <Link href="/settings" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-center text-gray-600">
                    Account Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}