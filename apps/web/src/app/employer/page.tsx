'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@skillsync/ui';
import { DEMO_OPPORTUNITIES, DEMO_USERS, DEMO_USER_SKILLS, DEMO_EVIDENCE } from '../../../../api/src/lib/demo-data';

export default function EmployerPage() {
  const [opportunities, setOpportunities] = useState(DEMO_OPPORTUNITIES);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(DEMO_OPPORTUNITIES[0].id);
  const [shortlisted, setShortlisted] = useState<string[]>([]);
  const [inspectingEvidence, setInspectingEvidence] = useState(false);

  useEffect(() => {
    async function loadOpportunities() {
      try {
        const res = await fetch('http://localhost:4000/opportunities', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setOpportunities(json.data.map((o: any, idx: number) => ({
              ...DEMO_OPPORTUNITIES[idx % DEMO_OPPORTUNITIES.length],
              id: o.id,
              title: o.title,
              company: o.organizationName || 'Partner Employer',
              location: o.location || 'Remote',
              type: o.type,
            })));
          }
        }
      } catch {
        // Use demo fallback
      }
    }
    loadOpportunities();
  }, []);

  const selectedOpp = opportunities.find((o) => o.id === selectedOpportunityId) || opportunities[0];

  const candidate = {
    ...DEMO_USERS.student,
    skills: DEMO_USER_SKILLS,
    evidence: DEMO_EVIDENCE,
    matchScore: selectedOpp.matchScore,
    reasons: selectedOpp.matchingReasons,
  };

  const isShortlisted = shortlisted.includes(candidate.id);

  const toggleShortlist = (id: string) => {
    if (shortlisted.includes(id)) {
      setShortlisted(shortlisted.filter((s) => s !== id));
    } else {
      setShortlisted([...shortlisted, id]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                🏢 Employer Portal
              </Badge>
              <span className="text-xs text-gray-400">● Stripe Talent Partner View</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Candidate Discovery & Verified Skill Match
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Discover candidates based on verified evidence, repo code, and confidence benchmarks—not resume buzzwords.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border-purple-200">
              {shortlisted.length} Shortlisted Candidates
            </Badge>
          </div>
        </div>

        {/* Opportunity Role Selector */}
        <div className="space-y-3">
          <h2 id="opportunity-role-heading" className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Select Active Job Role Requirement:
          </h2>
          <div role="radiogroup" aria-labelledby="opportunity-role-heading" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_OPPORTUNITIES.map((opp) => (
              <div
                key={opp.id}
                role="radio"
                aria-checked={opp.id === selectedOpportunityId}
                tabIndex={0}
                onClick={() => setSelectedOpportunityId(opp.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedOpportunityId(opp.id);
                  }
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  opp.id === selectedOpportunityId
                    ? 'bg-purple-50/60 border-purple-500 shadow-xs ring-1 ring-purple-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600">{opp.company}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {opp.type}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mt-1">{opp.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{opp.description}</p>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                  <span className="text-xs text-emerald-600 font-semibold">{opp.matchScore}% Top Match</span>
                  <span className="text-[10px] text-gray-400">• {opp.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Candidate Matching Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Candidate Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={candidate.avatarUrl}
                      alt={candidate.displayName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400/40 shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">{candidate.displayName}</h2>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">
                          ✓ Verified Candidate
                        </Badge>
                      </div>
                      <p className="text-xs text-indigo-200 mt-0.5">{candidate.headline}</p>
                      <p className="text-xs text-gray-400">{candidate.location} • Stanford University</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-white/10 p-3 rounded-xl backdrop-blur-xs">
                    <div className="text-2xl font-extrabold text-emerald-400">{candidate.matchScore}%</div>
                    <div className="text-[10px] text-indigo-200 uppercase font-semibold">Skill Match Score</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Match Reasons */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Why SkillSync Matched This Candidate:
                  </h4>
                  <div className="space-y-1.5">
                    {candidate.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 font-medium">
                        <span>✓</span> {reason}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skill Matrix */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Verified Skill & Confidence Matrix:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {candidate.skills.map((usk) => (
                      <div key={usk.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{usk.skill.name}</span>
                            <Badge variant="outline" className="text-[10px] bg-white">
                              {usk.proficiencyLevel}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-gray-500">
                            {usk.evidenceCount} verified evidence items
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-indigo-600">{usk.confidence}%</span>
                          <div className="text-[10px] text-gray-400">Confidence</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Verified Technical Evidence ({candidate.evidence.length})
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setInspectingEvidence(!inspectingEvidence)}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      {inspectingEvidence ? 'Hide Deep Audit' : 'Inspect Repo & AST Proof →'}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {candidate.evidence.map((ev) => (
                      <div key={ev.id} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                              {ev.type}
                            </Badge>
                            <span className="text-xs font-bold text-gray-900">{ev.title}</span>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            ✓ {ev.verifiedBy}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{ev.description}</p>
                        {ev.url && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline pt-1"
                          >
                            🔗 {ev.url}
                          </a>
                        )}

                        {inspectingEvidence && (
                          <div className="mt-2 p-3 rounded-lg bg-gray-900 text-indigo-300 text-xs font-mono space-y-1">
                            <div>AST Verification Hash: 0x9f88a32b1d7e</div>
                            <div>Code Complexity Index: O(N log N) - Optimal</div>
                            <div>Peer Assessment Percentile: 98th Percentile</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-gray-100">
                  <Button
                    onClick={() => toggleShortlist(candidate.id)}
                    className={`w-full sm:w-auto font-semibold ${
                      isShortlisted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {isShortlisted ? '✓ Candidate Shortlisted' : '➕ Shortlist Candidate'}
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto text-xs">
                    ✉️ Request Technical Interview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Job Requirements & Shortlist Drawer */}
          <div className="space-y-6">
            {/* Required Skills Card */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">
                  Role Skill Criteria: {selectedOpp.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedOpp.requiredSkills.map((req, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900">{req.name}</span>
                      {req.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {req.proficiency}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Shortlisted Candidates Summary */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">
                  Shortlisted Talent ({shortlisted.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shortlisted.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No candidates shortlisted yet. Click "Shortlist Candidate" to build your hiring pipeline.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-xs">
                      <div>
                        <span className="font-bold text-gray-900">{candidate.displayName}</span>
                        <div className="text-[10px] text-purple-600">Stanford University • 94% Match</div>
                      </div>
                      <Badge className="bg-purple-600 text-white text-[10px]">Shortlisted</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
