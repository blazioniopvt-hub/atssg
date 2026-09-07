'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import {
  careerReadinessApi,
  careerSimulationApi,
  targetRoleApi,
  TargetRole,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Badge, Button } from '@skillsync/ui';

interface ReadinessDTO {
  targetRole: { id: string; title: string; slug: string };
  overallReadiness: number;
  readinessLevel: 'NOT_READY' | 'EARLY_STAGE' | 'DEVELOPING' | 'ROLE_READY' | 'STRONG_MATCH';
  dimensions: {
    technicalSkillReadiness: number;
    evidenceReadiness: number;
    assessmentReadiness: number;
    projectReadiness: number;
    learningCompletion: number;
    roleAlignment: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendedFocus: string[];
}

interface SimulationDTO {
  id: string;
  targetRoleId?: string;
  roleTitle?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  scenarios: Array<{
    id: string;
    title: string;
    scenarioText: string;
    category: string;
    skillsEvaluated: string[];
    options: Array<{
      id: string;
      text: string;
    }>;
  }>;
  score?: number;
  results?: {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    skillBreakdown: Record<string, { score: number; questionsCount: number }>;
    feedback: Array<{
      scenarioId: string;
      selectedOptionId: string;
      isOptimal: boolean;
      score: number;
      explanation: string;
    }>;
  };
  createdAt: string;
  completedAt?: string;
}

export default function CareerSimulationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'readiness' | 'simulation' | 'compare'>('readiness');
  const [targetRoles, setTargetRoles] = useState<TargetRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<TargetRole | null>(null);

  // Readiness State
  const [readiness, setReadiness] = useState<ReadinessDTO | null>(null);
  const [roleComparisons, setRoleComparisons] = useState<any[]>([]);
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(true);

  // Simulation State
  const [simulations, setSimulations] = useState<SimulationDTO[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<SimulationDTO | null>(null);
  const [simulationAnswers, setSimulationAnswers] = useState<Record<string, string>>({});
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [isSubmittingSim, setIsSubmittingSim] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const loadInitialData = async () => {
    try {
      setIsLoadingReadiness(true);
      setError(null);

      const [rolesRes, readinessRes, simRes, compRes] = await Promise.all([
        targetRoleApi.listRoles().catch(() => ({ data: [] })),
        careerReadinessApi.getReadiness().catch(() => ({ data: null })),
        careerSimulationApi.listSimulations().catch(() => ({ data: [] })),
        careerReadinessApi.compareRoles().catch(() => ({ data: { roles: [] } })),
      ]);

      const fetchedRoles = rolesRes.data || [];
      setTargetRoles(fetchedRoles);
      setReadiness(readinessRes.data || null);
      setSimulations(simRes.data || []);
      setRoleComparisons(compRes.data?.roles || []);

      if (readinessRes.data?.targetRole) {
        const matched = fetchedRoles.find(r => r.id === readinessRes.data.targetRole.id || r.slug === readinessRes.data.targetRole.slug);
        setSelectedRole(matched || null);
      } else if (fetchedRoles.length > 0) {
        setSelectedRole(fetchedRoles[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load career readiness data');
    } finally {
      setIsLoadingReadiness(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const handleRoleChange = async (roleId: string) => {
    const role = targetRoles.find(r => r.id === roleId) || null;
    setSelectedRole(role);
    try {
      setIsLoadingReadiness(true);
      const res = await careerReadinessApi.getReadiness(roleId);
      setReadiness(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch role readiness');
    } finally {
      setIsLoadingReadiness(false);
    }
  };

  const handleStartNewSimulation = async () => {
    try {
      setIsSimLoading(true);
      setError(null);
      const createRes = await careerSimulationApi.createSimulation(selectedRole?.id);
      const sim = createRes.data;

      const startRes = await careerSimulationApi.startSimulation(sim.id);
      setActiveSimulation(startRes.data);
      setSimulationAnswers({});
      setActiveTab('simulation');
      setSuccessMessage('Simulation started! Address realistic scenarios to diagnose role readiness.');
    } catch (err: any) {
      setError(err.message || 'Failed to launch career simulation');
    } finally {
      setIsSimLoading(false);
    }
  };

  const handleSubmitSimulation = async () => {
    if (!activeSimulation) return;
    const answeredCount = Object.keys(simulationAnswers).length;
    if (answeredCount < activeSimulation.scenarios.length) {
      if (!confirm(`You have answered ${answeredCount} of ${activeSimulation.scenarios.length} scenarios. Submit anyway?`)) {
        return;
      }
    }

    try {
      setIsSubmittingSim(true);
      setError(null);
      const res = await careerSimulationApi.submitSimulation(activeSimulation.id, simulationAnswers);
      setActiveSimulation(res.data);
      setSuccessMessage('Simulation graded! SIMULATION_PERFORMANCE evidence has been bridged to your confidence profile.');

      // Refresh readiness & simulation history
      const [readinessRes, simRes, compRes] = await Promise.all([
        careerReadinessApi.getReadiness(selectedRole?.id),
        careerSimulationApi.listSimulations(),
        careerReadinessApi.compareRoles(),
      ]);
      setReadiness(readinessRes.data || null);
      setSimulations(simRes.data || []);
      setRoleComparisons(compRes.data?.roles || []);
    } catch (err: any) {
      setError(err.message || 'Failed to grade simulation');
    } finally {
      setIsSubmittingSim(false);
    }
  };

  const getTierColor = (level: string) => {
    switch (level) {
      case 'STRONG_MATCH':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'ROLE_READY':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'DEVELOPING':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'EARLY_STAGE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Phase 8 Engine
              </span>
              <span className="text-xs text-white/40">Career Readiness Simulation</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
              Career Readiness & Role Simulation
            </h1>
            <p className="text-sm text-white/60 mt-1 max-w-2xl">
              Deterministic 6-dimension readiness calculation paired with interactive, server-graded role scenarios. Bridge practical decision-making directly to proven career capability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {targetRoles.length > 0 && (
              <select
                value={selectedRole?.id || ''}
                onChange={e => handleRoleChange(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                {targetRoles.map(r => (
                  <option key={r.id} value={r.id}>
                    Target: {r.title}
                  </option>
                ))}
              </select>
            )}

            <Button
              onClick={handleStartNewSimulation}
              disabled={isSimLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 font-medium text-xs"
            >
              {isSimLoading ? 'Launching...' : '⚡ Launch Role Simulation'}
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">✕</button>
          </div>
        )}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('readiness')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'readiness'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            📊 6-Dimension Readiness
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'simulation'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            🎮 Active Simulation {activeSimulation ? `(${activeSimulation.status})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'compare'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            ⚖️ Role Comparison Matrix
          </button>
        </div>

        {/* TAB 1: 6-DIMENSION READINESS */}
        {activeTab === 'readiness' && (
          <div className="space-y-6">
            {isLoadingReadiness ? (
              <div className="p-12 text-center text-white/40 animate-pulse bg-white/[0.02] rounded-2xl border border-white/5">
                Computing multi-dimensional career readiness signals...
              </div>
            ) : readiness ? (
              <>
                {/* Hero Readiness Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 bg-slate-900/70 border-white/10 backdrop-blur-md">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                      <div>
                        <div className="text-xs uppercase font-semibold tracking-wider text-white/50">Target Role Diagnostics</div>
                        <h2 className="text-2xl font-bold text-white mt-1">{readiness.targetRole?.title || 'Target Role'}</h2>

                        <div className="mt-6 flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="relative flex items-center justify-center">
                            <svg className="w-36 h-36 transform -rotate-90">
                              <circle
                                cx="72"
                                cy="72"
                                r="58"
                                stroke="currentColor"
                                strokeWidth="12"
                                className="text-white/10"
                                fill="transparent"
                              />
                              <circle
                                cx="72"
                                cy="72"
                                r="58"
                                stroke="currentColor"
                                strokeWidth="12"
                                className="text-blue-500 transition-all duration-1000 ease-out"
                                fill="transparent"
                                strokeDasharray={364}
                                strokeDashoffset={364 - (364 * readiness.overallReadiness) / 100}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span className="text-4xl font-extrabold text-white">{readiness.overallReadiness}%</span>
                              <span className="text-[10px] uppercase tracking-wider text-white/40">Readiness</span>
                            </div>
                          </div>

                          <span className={`mt-4 px-3 py-1 rounded-full text-xs font-bold border ${getTierColor(readiness.readinessLevel)}`}>
                            {readiness.readinessLevel.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10">
                        <Button
                          onClick={handleStartNewSimulation}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                        >
                          Test in Simulation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 6 Dimensions Grid */}
                  <Card className="lg:col-span-2 bg-slate-900/70 border-white/10 backdrop-blur-md">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-white">
                        6-Dimension Readiness Breakdown
                      </CardTitle>
                      <p className="text-xs text-white/50">
                        Each score is strictly bounded and computed from verified signals, not subjective claims.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Dimension Bars */}
                      <div className="space-y-3.5">
                        {[
                          { label: 'Technical Skill Match', val: readiness.dimensions.technicalSkillReadiness, desc: 'Coverage of required & elective skills' },
                          { label: 'Evidence Strength', val: readiness.dimensions.evidenceReadiness, desc: 'Confidence weighting across verified artifacts' },
                          { label: 'Assessment Readiness', val: readiness.dimensions.assessmentReadiness, desc: 'Proctored quiz & code assessment mastery' },
                          { label: 'Project & Work-Sample', val: readiness.dimensions.projectReadiness, desc: 'Static repository analysis & technical depth' },
                          { label: 'Learning Roadmap Progress', val: readiness.dimensions.learningCompletion, desc: 'Completed milestones in personalized learning path' },
                          { label: 'Role Alignment', val: readiness.dimensions.roleAlignment, desc: 'Seniority and depth alignment with role standards' },
                        ].map((dim, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white">{dim.label}</span>
                              <span className="font-bold text-blue-400">{dim.val}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-teal-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${dim.val}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-white/40">{dim.desc}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Strengths & Action Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Validated Role Strengths</div>
                    <ul className="space-y-2 text-xs text-white/80">
                      {readiness.strengths?.length > 0 ? (
                        readiness.strengths.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>{s}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-white/40">Complete projects or assessments to establish strengths.</li>
                      )}
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Target Focus & Remediation</div>
                    <ul className="space-y-2 text-xs text-white/80">
                      {readiness.recommendedFocus?.length > 0 ? (
                        readiness.recommendedFocus.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">→</span>
                            <span>{f}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-white/40">No immediate critical gaps detected.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-white/10 bg-white/5">
                <p className="text-sm text-white/60">Select or assign a target role to generate your readiness analysis.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE SIMULATION RUNNER */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            {!activeSimulation ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto text-2xl">
                  🕹️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">No active simulation underway</h3>
                  <p className="text-xs text-white/50 mt-1 max-w-md mx-auto">
                    Role simulations place you into realistic production scenarios to measure technical architecture, trade-off analysis, and incident debugging.
                  </p>
                </div>
                <Button
                  onClick={handleStartNewSimulation}
                  disabled={isSimLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-6 py-2.5 font-semibold"
                >
                  {isSimLoading ? 'Generating Scenarios...' : 'Start Scenario Simulation'}
                </Button>
              </div>
            ) : activeSimulation.status === 'COMPLETED' ? (
              /* Simulation Results View */
              <div className="space-y-6">
                <Card className="bg-slate-900/80 border-emerald-500/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          Simulation Graded
                        </span>
                        <h2 className="text-2xl font-bold text-white mt-1">
                          Role Simulation Performance: {activeSimulation.score}%
                        </h2>
                      </div>
                      <Button
                        onClick={handleStartNewSimulation}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs"
                      >
                        Retake / New Scenario
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                        <div className="text-xs font-bold text-emerald-400 mb-2">Validated Strengths</div>
                        <ul className="space-y-1 text-xs text-white/70">
                          {activeSimulation.results?.strengths?.map((s, idx) => (
                            <li key={idx}>✓ {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20">
                        <div className="text-xs font-bold text-amber-400 mb-2">Areas for Remediation</div>
                        <ul className="space-y-1 text-xs text-white/70">
                          {activeSimulation.results?.weaknesses?.map((w, idx) => (
                            <li key={idx}>⚠ {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Scenario Decision Explanations */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-white">Scenario Decision Reviews</h4>
                      {activeSimulation.results?.feedback?.map((fb, idx) => {
                        const originalScenario = activeSimulation.scenarios.find(s => s.id === fb.scenarioId);
                        return (
                          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white">Scenario {idx + 1}: {originalScenario?.title || 'Production Decision'}</span>
                              <span className={`px-2 py-0.5 rounded font-bold ${fb.isOptimal ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                Score: {fb.score}/100 {fb.isOptimal ? '(Optimal)' : '(Suboptimal)'}
                              </span>
                            </div>
                            <p className="text-xs text-white/60">{originalScenario?.scenarioText}</p>
                            <div className="text-xs p-3 rounded-lg bg-black/40 border border-white/5 text-blue-200">
                              <span className="font-semibold">Trade-off Analysis: </span>
                              {fb.explanation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Simulation In-Progress Questionnaire */
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
                  <div>
                    <span className="font-bold text-blue-300">Simulation in progress:</span> Answer each scenario by choosing the most sound architectural or operational decision.
                  </div>
                  <div className="font-mono text-white/60">
                    {Object.keys(simulationAnswers).length} / {activeSimulation.scenarios.length} answered
                  </div>
                </div>

                <div className="space-y-6">
                  {activeSimulation.scenarios.map((scenario, sIdx) => (
                    <Card key={scenario.id} className="bg-slate-900/70 border-white/10">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-white/10 text-white/80">
                            Scenario {sIdx + 1} • {scenario.category}
                          </span>
                          <div className="flex gap-1">
                            {scenario.skillsEvaluated?.map((sk, k) => (
                              <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white">{scenario.title}</h3>
                          <p className="text-sm text-white/80 mt-2 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">
                            {scenario.scenarioText}
                          </p>
                        </div>

                        {/* Options */}
                        <div className="space-y-2 pt-2">
                          <div className="text-xs font-medium text-white/50">Select your recommended approach:</div>
                          {scenario.options.map(opt => {
                            const isSelected = simulationAnswers[scenario.id] === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setSimulationAnswers(prev => ({ ...prev, [scenario.id]: opt.id }))
                                }
                                className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-start gap-3 ${
                                  isSelected
                                    ? 'bg-blue-600/20 border-blue-500 text-white font-medium shadow-md shadow-blue-500/10'
                                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  isSelected ? 'border-blue-400 bg-blue-500 text-white text-[10px]' : 'border-white/30'
                                }`}>
                                  {isSelected ? '✓' : ''}
                                </span>
                                <span>{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button
                    onClick={handleSubmitSimulation}
                    disabled={isSubmittingSim}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-8 py-2.5 font-bold shadow-lg shadow-emerald-600/20"
                  >
                    {isSubmittingSim ? 'Evaluating & Grading...' : 'Submit Decisions for Grading'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROLE COMPARISON MATRIX */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <Card className="bg-slate-900/70 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white">
                  Multi-Role Career Readiness Comparison
                </CardTitle>
                <p className="text-xs text-white/50">
                  Compare your verified skill & evidence profile across key engineering roles to identify transition pathways.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {roleComparisons.length === 0 ? (
                  <div className="p-8 text-center text-white/40 text-xs">
                    No role comparisons available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roleComparisons.map((r, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-white">{r.roleTitle}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getTierColor(r.readinessLevel)}`}>
                            {r.overallReadiness}% • {r.readinessLevel}
                          </span>
                        </div>

                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${r.overallReadiness}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-white/60 pt-2 border-t border-white/5">
                          <div>
                            <span className="text-white/40">Matched Skills:</span>{' '}
                            <span className="text-emerald-300 font-semibold">{r.matchedSkillsCount}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Missing Gaps:</span>{' '}
                            <span className="text-amber-300 font-semibold">{r.missingSkillsCount}</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleRoleChange(r.roleId)}
                          className="w-full bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 mt-2"
                        >
                          Focus on this Target Role
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
