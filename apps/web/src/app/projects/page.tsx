'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { projectsApi, portfolioApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Badge, Button } from '@skillsync/ui';

interface ProjectEvaluationDTO {
  id: string;
  projectId: string;
  qualityScore: number;
  technicalDepthScore: number;
  architectureScore: number;
  testingScore: number;
  documentationScore: number;
  deploymentScore: number;
  detectedSkills: Array<{
    skillSlug: string;
    skillName: string;
    confidence: number;
    evidenceLevel: string;
    reason: string;
  }>;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  createdAt: string;
}

interface ProjectDTO {
  id: string;
  title: string;
  description: string;
  source: string;
  repositoryUrl?: string;
  liveUrl?: string;
  documentationUrl?: string;
  tags: string[];
  skills: Array<{ id: string; skill: { name: string; slug: string } }>;
  evaluations: ProjectEvaluationDTO[];
  createdAt: string;
}

interface PortfolioDTO {
  portfolioStrength: number;
  projectCount: number;
  evaluatedCount: number;
  strongSkills: Array<{ skillSlug: string; skillName: string; count: number }>;
  moderateSkills: Array<{ skillSlug: string; skillName: string; count: number }>;
  missingGaps: Array<{ skillSlug: string; skillName: string; reason: string }>;
  roleAlignment?: number;
}

export default function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals & Active Selections
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<{ project: ProjectDTO; evaluation: ProjectEvaluationDTO } | null>(null);
  const [analyzingProjectId, setAnalyzingProjectId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: 'GITHUB',
    repositoryUrl: '',
    liveUrl: '',
    documentationUrl: '',
    tags: '',
    autoAnalyze: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [projRes, portRes] = await Promise.all([
        projectsApi.listProjects().catch(() => ({ data: [] })),
        portfolioApi.getPortfolio().catch(() => ({ data: null })),
      ]);
      setProjects(projRes.data || []);
      setPortfolio(portRes.data || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and Description are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const res = await projectsApi.createProject({
        title: formData.title.trim(),
        description: formData.description.trim(),
        source: formData.source,
        repositoryUrl: formData.repositoryUrl.trim() || undefined,
        liveUrl: formData.liveUrl.trim() || undefined,
        documentationUrl: formData.documentationUrl.trim() || undefined,
        tags: tagsArray,
      });

      const newProject = res.data;

      if (formData.autoAnalyze && newProject?.id) {
        try {
          const evalRes = await projectsApi.analyzeProject(newProject.id);
          newProject.evaluations = [evalRes.data];
        } catch {
          // non-blocking
        }
      }

      setSuccessMessage('Project successfully ingested and evaluated!');
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        description: '',
        source: 'GITHUB',
        repositoryUrl: '',
        liveUrl: '',
        documentationUrl: '',
        tags: '',
        autoAnalyze: true,
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async (projectId: string) => {
    try {
      setAnalyzingProjectId(projectId);
      setError(null);
      const res = await projectsApi.analyzeProject(projectId);
      setSuccessMessage('Work-sample static evaluation completed! Skill evidence updated in Confidence Engine.');
      await loadData();
      const matched = projects.find(p => p.id === projectId);
      if (matched) {
        setSelectedEvaluation({ project: matched, evaluation: res.data });
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzingProjectId(null);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? Associated evidence will be archived.')) return;
    try {
      await projectsApi.deleteProject(projectId);
      setSuccessMessage('Project deleted successfully.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Phase 7 Engine
              </span>
              <span className="text-xs text-white/40">Work-Sample & Project Intelligence</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
              Work-Sample & Project Intelligence
            </h1>
            <p className="text-sm text-white/60 mt-1 max-w-2xl">
              Transform claims into proven capability. Safe static repository analysis extracts verified skill evidence, computes architectural quality, and directly powers your Career Confidence Engine.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              Refresh
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 font-medium"
            >
              + Ingest New Project
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

        {/* Portfolio Intelligence Overview */}
        {portfolio && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md">
              <CardContent className="pt-6">
                <div className="text-xs font-medium uppercase tracking-wider text-white/50">Portfolio Strength</div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-emerald-400">{portfolio.portfolioStrength}%</span>
                  <span className="text-xs text-white/40">quality score</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${portfolio.portfolioStrength}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md">
              <CardContent className="pt-6">
                <div className="text-xs font-medium uppercase tracking-wider text-white/50">Projects Ingested</div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-white">{projects.length}</span>
                  <span className="text-xs text-white/40">({portfolio.evaluatedCount} evaluated)</span>
                </div>
                <p className="text-xs text-white/50 mt-3">Static AST & metadata analyzed</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md">
              <CardContent className="pt-6">
                <div className="text-xs font-medium uppercase tracking-wider text-white/50">Strong Evidence Skills</div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-teal-400">{portfolio.strongSkills?.length || 0}</span>
                  <span className="text-xs text-white/40">skills proven</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {portfolio.strongSkills?.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-medium">
                      {s.skillName}
                    </span>
                  ))}
                  {(portfolio.strongSkills?.length || 0) > 3 && (
                    <span className="text-[10px] text-white/40 self-center">+{portfolio.strongSkills.length - 3} more</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md">
              <CardContent className="pt-6">
                <div className="text-xs font-medium uppercase tracking-wider text-white/50">Missing Evidence</div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-amber-400">{portfolio.missingGaps?.length || 0}</span>
                  <span className="text-xs text-white/40">role gaps</span>
                </div>
                <p className="text-xs text-amber-300/70 mt-3">Recommended for Next Best Action</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Project List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Ingested Projects & Work Samples</h2>
            <span className="text-xs text-white/40">All external code is processed via non-executing static analysis</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-white/40 animate-pulse bg-white/[0.02] rounded-2xl border border-white/5">
              Evaluating project repository structures and skills...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                📂
              </div>
              <h3 className="text-base font-medium text-white">No projects added yet</h3>
              <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
                Add your GitHub repositories, full-stack applications, or work samples to generate verifiable skill evidence.
              </p>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2"
              >
                Ingest Your First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {projects.map(proj => {
                const latestEval = proj.evaluations?.[0];
                return (
                  <Card key={proj.id} className="bg-slate-900/50 border-white/10 hover:border-white/20 transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        {/* Project Info */}
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-xl font-bold text-white tracking-tight">{proj.title}</h3>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-white/70 border border-white/10">
                              {proj.source}
                            </span>
                            {latestEval ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Quality: {latestEval.qualityScore}/100
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Evaluation Pending
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-white/70 leading-relaxed max-w-3xl">
                            {proj.description}
                          </p>

                          {/* Links & Tags */}
                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            {proj.repositoryUrl && (
                              <a
                                href={proj.repositoryUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                              >
                                <span>🔗 Repo:</span> {proj.repositoryUrl}
                              </a>
                            )}
                            {proj.liveUrl && (
                              <a
                                href={proj.liveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
                              >
                                <span>🌐 Live Demo:</span> {proj.liveUrl}
                              </a>
                            )}
                          </div>

                          {/* Tags */}
                          {proj.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {proj.tags.map((tag, i) => (
                                <span key={i} className="text-xs px-2.5 py-0.5 rounded-md bg-white/5 text-white/60 border border-white/5">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Evaluated Skills Bar */}
                          {latestEval?.detectedSkills && latestEval.detectedSkills.length > 0 && (
                            <div className="pt-2 border-t border-white/5">
                              <div className="text-xs font-medium text-white/50 mb-2">Demonstrated Skills & Evidence Boost:</div>
                              <div className="flex flex-wrap gap-2">
                                {latestEval.detectedSkills.map((sk, i) => (
                                  <div
                                    key={i}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs flex items-center gap-2"
                                  >
                                    <span className="font-semibold text-emerald-300">{sk.skillName}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200">
                                      +{sk.confidence}% Conf
                                    </span>
                                    <span className="text-[10px] text-white/40 uppercase">{sk.evidenceLevel}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Column */}
                        <div className="flex lg:flex-col items-center gap-2 self-end lg:self-start min-w-[140px]">
                          {latestEval ? (
                            <Button
                              onClick={() => setSelectedEvaluation({ project: proj, evaluation: latestEval })}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs border border-white/10"
                            >
                              View Breakdown
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleAnalyze(proj.id)}
                              disabled={analyzingProjectId === proj.id}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                            >
                              {analyzingProjectId === proj.id ? 'Analyzing...' : 'Run Static Analysis'}
                            </Button>
                          )}

                          {latestEval && (
                            <Button
                              variant="outline"
                              onClick={() => handleAnalyze(proj.id)}
                              disabled={analyzingProjectId === proj.id}
                              className="w-full text-xs border-white/10 text-white/70 hover:text-white"
                            >
                              {analyzingProjectId === proj.id ? 'Analyzing...' : 'Re-Evaluate'}
                            </Button>
                          )}

                          <button
                            onClick={() => handleDelete(proj.id)}
                            className="text-xs text-rose-400/60 hover:text-rose-300 p-2"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Evaluation Detail Modal */}
        {selectedEvaluation && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Work-Sample Evaluation
                  </span>
                  <h2 className="text-2xl font-bold text-white mt-1">{selectedEvaluation.project.title}</h2>
                  <p className="text-xs text-white/50">Evaluation generated on {new Date(selectedEvaluation.evaluation.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setSelectedEvaluation(null)}
                  className="text-white/40 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              {/* 5-Dimension Scores */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[11px] text-white/50 uppercase font-medium">Architecture</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{selectedEvaluation.evaluation.architectureScore}</div>
                  <div className="text-[10px] text-white/30">/ 100</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[11px] text-white/50 uppercase font-medium">Tech Depth</div>
                  <div className="text-2xl font-bold text-teal-400 mt-1">{selectedEvaluation.evaluation.technicalDepthScore}</div>
                  <div className="text-[10px] text-white/30">/ 100</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[11px] text-white/50 uppercase font-medium">Testing & QA</div>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">{selectedEvaluation.evaluation.testingScore}</div>
                  <div className="text-[10px] text-white/30">/ 100</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[11px] text-white/50 uppercase font-medium">Docs & API</div>
                  <div className="text-2xl font-bold text-sky-400 mt-1">{selectedEvaluation.evaluation.documentationScore}</div>
                  <div className="text-[10px] text-white/30">/ 100</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-white/50 uppercase font-medium">Deployment</div>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{selectedEvaluation.evaluation.deploymentScore}</div>
                  <div className="text-[10px] text-white/30">/ 100</div>
                </div>
              </div>

              {/* Summary */}
              {selectedEvaluation.evaluation.summary && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="text-xs font-semibold text-white/60 uppercase">Evaluation Summary</div>
                  <p className="text-sm text-white/80">{selectedEvaluation.evaluation.summary}</p>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                  <div className="text-xs font-bold text-emerald-400 mb-2">Strengths Detected</div>
                  <ul className="space-y-1 text-xs text-white/70">
                    {selectedEvaluation.evaluation.strengths?.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">✓</span> {s}
                      </li>
                    )) || <li>No explicit strengths recorded</li>}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20">
                  <div className="text-xs font-bold text-amber-400 mb-2">Areas for Improvement</div>
                  <ul className="space-y-1 text-xs text-white/70">
                    {selectedEvaluation.evaluation.weaknesses?.map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">!</span> {w}
                      </li>
                    )) || <li>No weaknesses recorded</li>}
                  </ul>
                </div>
              </div>

              {/* Detected Skills Breakdown */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-white">Extracted Skill Evidence</div>
                <div className="space-y-2">
                  {selectedEvaluation.evaluation.detectedSkills.map((sk, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{sk.skillName}</div>
                        <div className="text-xs text-white/50 mt-0.5">{sk.reason}</div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          +{sk.confidence}% Confidence
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/60">
                          {sk.evidenceLevel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety notice */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-center gap-2">
                <span>🛡️</span>
                <span>All static evaluation runs in a sandboxed, zero-execution environment. Your skill evidence is cryptographically bound to your user record.</span>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setSelectedEvaluation(null)} className="bg-white/10 hover:bg-white/20 text-white text-xs">
                  Close Breakdown
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Project Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Ingest Project / Work Sample</h2>
                  <p className="text-xs text-white/50">Submit a project or repository to generate verified skill evidence.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-white/40 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label htmlFor="projectTitle" className="block text-xs font-medium text-white/70 mb-1">Project Title *</label>
                  <input
                    id="projectTitle"
                    type="text"
                    required
                    placeholder="e.g., Real-Time Fraud Detection Engine"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="projectSource" className="block text-xs font-medium text-white/70 mb-1">Source Type</label>
                    <select
                      id="projectSource"
                      value={formData.source}
                      onChange={e => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="GITHUB">GitHub Repository</option>
                      <option value="WORK_SAMPLE">Work Sample / Production</option>
                      <option value="PORTFOLIO">Portfolio Project</option>
                      <option value="MANUAL">Manual Submission</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="projectRepoUrl" className="block text-xs font-medium text-white/70 mb-1">Repository URL</label>
                    <input
                      id="projectRepoUrl"
                      type="url"
                      placeholder="https://github.com/..."
                      value={formData.repositoryUrl}
                      onChange={e => setFormData({ ...formData, repositoryUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="projectDesc" className="block text-xs font-medium text-white/70 mb-1">Description & Architecture Overview *</label>
                  <textarea
                    id="projectDesc"
                    required
                    rows={3}
                    placeholder="Describe the system architecture, frameworks used (e.g. Next.js, FastAPI, PostgreSQL, Docker), testing strategy, and deployment configuration..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="projectLiveUrl" className="block text-xs font-medium text-white/70 mb-1">Live Demo URL</label>
                    <input
                      id="projectLiveUrl"
                      type="url"
                      placeholder="https://..."
                      value={formData.liveUrl}
                      onChange={e => setFormData({ ...formData, liveUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="projectDocsUrl" className="block text-xs font-medium text-white/70 mb-1">Documentation URL</label>
                    <input
                      id="projectDocsUrl"
                      type="url"
                      placeholder="https://..."
                      value={formData.documentationUrl}
                      onChange={e => setFormData({ ...formData, documentationUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="projectTags" className="block text-xs font-medium text-white/70 mb-1">Technologies / Tags (comma separated)</label>
                  <input
                    id="projectTags"
                    type="text"
                    placeholder="TypeScript, Docker, PostgreSQL, Redis, Jest"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="autoAnalyze"
                    checked={formData.autoAnalyze}
                    onChange={e => setFormData({ ...formData, autoAnalyze: e.target.checked })}
                    className="rounded bg-white/10 border-white/20 text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="autoAnalyze" className="text-xs text-white/80">
                    Automatically run static analysis & bridge extracted evidence to Skill Confidence Engine
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    className="border-white/10 text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                  >
                    {isSubmitting ? 'Ingesting...' : 'Ingest & Evaluate'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
