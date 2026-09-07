'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import {
  careerCoachApi,
  targetRoleApi,
  TargetRole,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Badge, Button } from '@skillsync/ui';

interface NextActionDTO {
  actionType: string;
  title: string;
  description: string;
  reason: string;
  skillsStrengthened: string[];
  estimatedEffort: string;
  expectedImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  supportingSignals: string[];
  actionLink?: string;
}

interface CoachMessageDTO {
  id: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  actionPayload?: any;
  createdAt: string;
}

interface CoachSessionDTO {
  id: string;
  title: string;
  targetRoleId?: string;
  messages: CoachMessageDTO[];
  createdAt: string;
  updatedAt: string;
}

const QUICK_PROMPTS = [
  'What should I focus on next to increase my readiness?',
  'Why is my career readiness score at its current level?',
  'Which project should I build next to close role gaps?',
  'Am I ready for an AI/ML or Backend Engineer role?',
  'Which skills are holding me back the most?',
];

export default function CareerCoachPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<CoachSessionDTO[]>([]);
  const [activeSession, setActiveSession] = useState<CoachSessionDTO | null>(null);
  const [nextAction, setNextAction] = useState<NextActionDTO | null>(null);
  const [recommendations, setRecommendations] = useState<NextActionDTO[]>([]);
  const [targetRoles, setTargetRoles] = useState<TargetRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<TargetRole | null>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  const loadCoachData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [actionRes, recsRes, sessionsRes, rolesRes] = await Promise.all([
        careerCoachApi.getNextAction().catch(() => ({ data: null })),
        careerCoachApi.getRecommendations().catch(() => ({ data: [] })),
        careerCoachApi.listSessions().catch(() => ({ data: [] })),
        targetRoleApi.listRoles().catch(() => ({ data: [] })),
      ]);

      setNextAction(actionRes.data || null);
      setRecommendations(recsRes.data || []);
      const fetchedSessions = sessionsRes.data || [];
      setSessions(fetchedSessions);
      setTargetRoles(rolesRes.data || []);

      if (fetchedSessions.length > 0) {
        // Load latest session details
        const latestId = fetchedSessions[0].id;
        const detailRes = await careerCoachApi.getSession(latestId);
        setActiveSession(detailRes.data);
      } else {
        // Auto-create initial session
        const newSessionRes = await careerCoachApi.createSession(undefined, 'Career Strategy Session');
        setActiveSession(newSessionRes.data);
        setSessions([newSessionRes.data]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize AI Career Coach');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCoachData();
    }
  }, [user]);

  const handleCreateSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await careerCoachApi.createSession(selectedRole?.id, 'New Coaching Conversation');
      setActiveSession(res.data);
      setSessions(prev => [res.data, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const res = await careerCoachApi.getSession(sessionId);
      setActiveSession(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const message = textToSend || inputMessage;
    if (!message.trim() || !activeSession || isSending) return;

    try {
      setIsSending(true);
      setError(null);
      setInputMessage('');

      // Optimistic user message append
      const tempUserMsg: CoachMessageDTO = {
        id: `temp-${Date.now()}`,
        sender: 'USER',
        content: message.trim(),
        createdAt: new Date().toISOString(),
      };
      setActiveSession(prev => prev ? { ...prev, messages: [...prev.messages, tempUserMsg] } : prev);

      const res = await careerCoachApi.sendMessage(activeSession.id, message.trim());
      setActiveSession(res.data);

      // Refresh next best action as signals might have shifted
      const updatedAction = await careerCoachApi.getNextAction(selectedRole?.id).catch(() => null);
      if (updatedAction?.data) {
        setNextAction(updatedAction.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to receive coach response');
    } finally {
      setIsSending(false);
    }
  };

  const getActionBadgeColor = (type: string) => {
    switch (type) {
      case 'BUILD_PROJECT':
      case 'IMPROVE_PROJECT':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'ASSESS':
      case 'VERIFY_SKILL':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'TAKE_SIMULATION':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'LEARN':
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  const getActionDestination = (type: string) => {
    switch (type) {
      case 'BUILD_PROJECT':
      case 'IMPROVE_PROJECT':
        return '/projects';
      case 'TAKE_SIMULATION':
        return '/career-simulation';
      case 'ASSESS':
      case 'VERIFY_SKILL':
      case 'LEARN':
      default:
        return '/learning';
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Phase 9 Engine
              </span>
              <span className="text-xs text-white/40">AI Career Coach & Next-Best-Action</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
              AI Career Coach & Next-Best-Action
            </h1>
            <p className="text-sm text-white/60 mt-1 max-w-2xl">
              Grounded reasoning over verified SkillSync data. No hallucinations, no arbitrary advice. Every recommendation is backed by your actual confidence, evidence, and target role gaps.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreateSession}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-lg shadow-purple-500/20"
            >
              + New Session
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

        {/* HERO: DETERMINISTIC NEXT-BEST-ACTION */}
        {nextAction && (
          <Card className="bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-blue-950/40 border-purple-500/30 backdrop-blur-md">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                      ★ NEXT BEST ACTION
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadgeColor(nextAction.actionType)}`}>
                      {nextAction.actionType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-white/40">
                      Impact: <strong className="text-purple-300">{nextAction.expectedImpact}</strong> • Est. Effort: <strong className="text-white/80">{nextAction.estimatedEffort}</strong>
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {nextAction.title}
                  </h2>

                  <p className="text-sm text-white/80 leading-relaxed max-w-3xl">
                    {nextAction.description}
                  </p>

                  {/* Supporting Signals & Skills */}
                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white/50">Skills Targeted:</span>
                      {nextAction.skillsStrengthened?.map((sk, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white/10 text-white/90 font-medium text-[11px]">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[180px]">
                  <Link href={getActionDestination(nextAction.actionType)}>
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-purple-500/20 py-2.5">
                      Take This Action →
                    </Button>
                  </Link>
                  <button
                    onClick={() => handleSendMessage(`Tell me more about why "${nextAction.title}" is my next best action and how it will improve my career readiness.`)}
                    className="w-full text-center text-xs text-purple-300 hover:text-purple-200 py-1"
                  >
                    Ask Coach for Details
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MAIN CHAT & CONVERSATION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white/50">Coaching Sessions</div>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    activeSession?.id === s.id
                      ? 'bg-purple-600/20 border-purple-500/40 text-white font-semibold'
                      : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="truncate">{s.title || 'Coaching Session'}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Actions List */}
            {recommendations.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/50">Prioritized Action Queue</div>
                {recommendations.slice(1, 4).map((rec, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] space-y-1">
                    <div className="font-semibold text-white truncate">{rec.title}</div>
                    <div className="text-[10px] text-purple-300">{rec.actionType}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Conversation Pane */}
          <Card className="lg:col-span-3 bg-slate-900/80 border-white/10 flex flex-col h-[650px]">
            {/* Session Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-white">
                  {activeSession?.title || 'AI Career Coach'}
                </span>
              </div>
              <span className="text-[11px] text-white/40">Fable 5.1 Intelligence Layer</span>
            </div>

            {/* Messages Scroll Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {activeSession?.messages?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl">
                    💡
                  </div>
                  <h4 className="text-sm font-bold text-white">Ask your Career Coach anything</h4>
                  <p className="text-xs text-white/50 max-w-sm">
                    Inquire about role transitions, why specific skills are holding you back, or how to design portfolio projects for target roles.
                  </p>
                </div>
              ) : (
                activeSession?.messages?.map((msg, idx) => {
                  const isUser = msg.sender === 'USER';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-white/40 mb-1 px-1">
                        {isUser ? 'You' : 'SkillSync Career Coach'}
                      </div>
                      <div
                        className={`max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? 'bg-purple-600 text-white rounded-br-xs'
                            : 'bg-white/10 text-white/90 rounded-bl-xs border border-white/10'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Embedded Action Card if surfaced */}
                        {msg.actionPayload && (
                          <div className="mt-3 p-3 rounded-xl bg-black/40 border border-purple-500/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                                Recommended Action
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200">
                                {msg.actionPayload.actionType}
                              </span>
                            </div>
                            <div className="font-bold text-white text-xs">{msg.actionPayload.title}</div>
                            <p className="text-[11px] text-white/70">{msg.actionPayload.reason}</p>
                            <Link href={getActionDestination(msg.actionPayload.actionType)}>
                              <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white text-[11px] py-1.5 mt-1">
                                Execute Action →
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {isSending && (
                <div className="flex items-center gap-2 text-xs text-purple-400 p-2 animate-pulse">
                  <span>✦ SkillSync AI Coach is analyzing verified evidence and synthesizing response...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto">
              {QUICK_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isSending}
                  className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="p-4 border-t border-white/10 bg-black/20">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a question about your skills, readiness, or roadmap..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  disabled={isSending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                />
                <Button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-5 py-2.5 font-semibold"
                >
                  Send
                </Button>
              </form>
              <div className="text-[10px] text-white/30 text-center mt-2">
                🔒 Protected by strict system boundary isolation. Coach responses are strictly grounded in SkillSync verified database state.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
