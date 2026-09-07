import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { Button, Badge } from '@skillsync/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* SaaS Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold tracking-wide uppercase shadow-inner">
            <span>✦</span> Skill Intelligence & Talent Verification Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-none">
            College is one attribute, not a proxy for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">
              actual capability.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Traditional hiring relies on weak proxies—college tier, degree titles, and resume keywords. SkillSync measures, validates, and proves true technical capability through multi-factor evidence.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105">
                🎓 Explore Student View
              </Button>
            </Link>
            <Link href="/employer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-700 hover:border-slate-500 text-slate-200 hover:bg-slate-900 font-semibold px-8 py-3.5 rounded-xl transition-all">
                🏢 Employer Talent Match
              </Button>
            </Link>
            <Link href="/college" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-purple-800/80 hover:border-purple-600 text-purple-300 hover:bg-purple-950/40 font-semibold px-8 py-3.5 rounded-xl transition-all">
                🏛️ Institutional Analytics
              </Button>
            </Link>
          </div>

          {/* Core Product Loop Metric Strip */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
              <div className="text-2xl font-bold text-indigo-400">LEARN → BUILD</div>
              <div className="text-xs text-slate-400 mt-1">Continuous Skill Growth</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
              <div className="text-2xl font-bold text-purple-400">ASSESS → PROVE</div>
              <div className="text-xs text-slate-400 mt-1">Verified Project Evidence</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
              <div className="text-2xl font-bold text-emerald-400">GRAPH & GAPS</div>
              <div className="text-xs text-slate-400 mt-1">Topological Learning Paths</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
              <div className="text-2xl font-bold text-amber-400">MATCH & HIRE</div>
              <div className="text-xs text-slate-400 mt-1">B2B Talent Intelligence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs. Solution Thesis Grid */}
      <section className="py-20 bg-slate-900/80 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-950/40">
              The Fundamental Shift
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Replacing Weak Proxies with Trusted Skill Intelligence
            </h2>
            <p className="text-slate-400 text-base">
              Hiring decisions shouldn't rely on unverified claims. SkillSync computes dynamic confidence scores using multi-factor evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Weak Proxy Side */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-rose-900/30 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-rose-950/80 text-rose-400 border-b border-l border-rose-800/40 text-xs font-bold rounded-bl-xl">
                Traditional System (Weak Signals)
              </div>

              <h3 className="text-xl font-bold text-rose-300 flex items-center gap-2">
                <span>⚠️</span> High Friction & False Negatives
              </h3>

              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 text-base font-bold">✕</span>
                  <div>
                    <strong className="text-slate-100">College Brand & Tier:</strong> Rejects talented self-starters and candidates outside tier-1 institutions.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 text-base font-bold">✕</span>
                  <div>
                    <strong className="text-slate-100">CGPA & Degree Names:</strong> Indicates exam performance, not software architecture or production coding skill.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 text-base font-bold">✕</span>
                  <div>
                    <strong className="text-slate-100">Resume Keywords & Self-Reporting:</strong> Easily gamed with buzzwords without proof of execution.
                  </div>
                </li>
              </ul>
            </div>

            {/* SkillSync Solution Side */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-6 relative overflow-hidden shadow-xl shadow-indigo-950/30">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-bl-xl shadow-md">
                SkillSync Engine (Verified Signals)
              </div>

              <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                <span>⚡</span> Verified Capability & High Trust
              </h3>

              <ul className="space-y-4 text-sm text-slate-200">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 text-base font-bold">✓</span>
                  <div>
                    <strong className="text-white">Multi-Type Evidence Weighting:</strong> Combines GitHub repos, AWS certifications, and peer reviews.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 text-base font-bold">✓</span>
                  <div>
                    <strong className="text-white">Diminishing-Returns Confidence Algorithm:</strong> Calculates realistic 0-100% confidence based on recency & verification.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 text-base font-bold">✓</span>
                  <div>
                    <strong className="text-white">Topological Skill Graph:</strong> Identifies prerequisite foundations and industry skill gaps.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Persona Entry Showcase */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Built for Students, Employers & Universities
          </h2>
          <p className="text-slate-400 text-base">
            Select a persona to experience SkillSync's capability intelligence platform in action.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Student Card */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-900/50 border border-indigo-700/40 flex items-center justify-center text-2xl">
                🎓
              </div>
              <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                Students & Candidates
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Build an evidence-backed skill profile. Upload resumes for instant AI skill extraction, discover prerequisite gaps, and follow personalized learning paths.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">Confidence Engine</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">AI Resume Parsing</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">Learning Milestones</span>
              </div>
            </div>
            <div className="pt-8">
              <Link href="/dashboard">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">
                  Launch Student View →
                </Button>
              </Link>
            </div>
          </div>

          {/* Employer Card */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-900/50 border border-purple-700/40 flex items-center justify-center text-2xl">
                🏢
              </div>
              <h3 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                Employers & Recruiters
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Define role skill requirements and instantly discover candidate matches based on verified evidence, repo code, and confidence benchmarks—not resume buzzwords.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">Skill Match Matrix</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">Evidence Inspector</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">Shortlisting</span>
              </div>
            </div>
            <div className="pt-8">
              <Link href="/employer">
                <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl">
                  Launch Employer View →
                </Button>
              </Link>
            </div>
          </div>

          {/* College Card */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all group flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-2xl">
                🏛️
              </div>
              <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Colleges & Placement
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Monitor student skill distributions across departments, identify industry alignment gaps, and present verified institutional readiness metrics to top recruiters.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">Cohort Analytics</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">Industry Gap Heatmap</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">Readiness Reports</span>
              </div>
            </div>
            <div className="pt-8">
              <Link href="/college">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl">
                  Launch Institutional View →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-400 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">⚡</div>
            <span className="font-bold text-slate-200 text-sm">SkillSync</span>
            <span>— Trusted Skill & Talent Intelligence Platform</span>
          </div>
          <div>
            © 2026 SkillSync Inc. Investor Demo Edition.
          </div>
        </div>
      </footer>
    </div>
  );
}