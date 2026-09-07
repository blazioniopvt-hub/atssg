'use client';

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@skillsync/ui';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  joinedAt: string;
}

interface Cohort {
  id: string;
  name: string;
  program: string;
  graduationYear: number;
  studentCount: number;
}

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<'COHORTS' | 'ROSTER' | 'INVITES' | 'SETTINGS'>('COHORTS');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('CANDIDATE');
  const [issuedTokens, setIssuedTokens] = useState<Array<{ email: string; role: string; token: string }>>([
    {
      email: 'new_faculty@stanford.edu',
      role: 'FACULTY',
      token: 'sk_inv_98a72b1e4f0c8d6e3a',
    },
  ]);

  const [cohorts, setCohorts] = useState<Cohort[]>([
    { id: 'coh_1', name: 'Class of 2026 - AI & Systems Batch A', program: 'M.S. Computer Science', graduationYear: 2026, studentCount: 142 },
    { id: 'coh_2', name: 'Class of 2025 - Fullstack Engineering', program: 'B.S. Software Engineering', graduationYear: 2025, studentCount: 218 },
    { id: 'coh_3', name: 'Class of 2026 - Data Intelligence', program: 'M.S. Data Science', graduationYear: 2026, studentCount: 88 },
  ]);

  const [members] = useState<Member[]>([
    { id: 'mem_1', name: 'Dr. Jennifer Widom', email: 'dean@stanford.edu', role: 'OWNER', department: 'Computer Science', joinedAt: '2024-01-15' },
    { id: 'mem_2', name: 'Sarah Chen (Candidate)', email: 'sarah.c@stanford.edu', role: 'CANDIDATE', department: 'AI & Systems', joinedAt: '2024-08-20' },
    { id: 'mem_3', name: 'Alex Rivera', email: 'alex.r@stanford.edu', role: 'CANDIDATE', department: 'Fullstack Eng', joinedAt: '2024-08-22' },
    { id: 'mem_4', name: 'Prof. Dan Jurafsky', email: 'dan.j@stanford.edu', role: 'FACULTY', department: 'Linguistics & CS', joinedAt: '2024-02-10' },
    { id: 'mem_5', name: 'Marcus Vance', email: 'marcus.v@stripe.com', role: 'RECRUITER', department: 'Industry Partner', joinedAt: '2024-03-05' },
  ]);

  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortProgram, setNewCohortProgram] = useState('M.S. Computer Science');

  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName) return;
    const newCohort: Cohort = {
      id: `coh_${Date.now()}`,
      name: newCohortName,
      program: newCohortProgram,
      graduationYear: 2027,
      studentCount: 0,
    };
    setCohorts([...cohorts, newCohort]);
    setNewCohortName('');
  };

  const handleIssueInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    const newToken = `sk_inv_${Math.random().toString(36).substring(2, 15)}`;
    setIssuedTokens([...issuedTokens, { email: inviteEmail, role: inviteRole, token: newToken }]);
    setInviteEmail('');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs">
                🏛️ Institutional Multi-Tenant Console
              </Badge>
              <span className="text-xs text-gray-400">● Stanford University (Active Tenant)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Organization & Cohort Intelligence
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage departments, curricular cohorts, candidate rosters, and institutional access tokens.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
              Verified Educational License (PRO)
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          {[
            { id: 'COHORTS', label: '🎓 Cohorts & Hierarchy' },
            { id: 'ROSTER', label: '👥 Member Roster' },
            { id: 'INVITES', label: '✉️ Issuing & Invitations' },
            { id: 'SETTINGS', label: '⚙️ Tenant Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Cohorts */}
        {activeTab === 'COHORTS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cohorts.map((c) => (
                  <Card key={c.id} className="border-gray-200 shadow-xs hover:border-indigo-200 transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{c.program}</span>
                        <Badge variant="outline" className="text-[10px]">
                          Grad: {c.graduationYear}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-gray-900 mt-1">
                        {c.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
                        <span className="text-gray-500 font-medium">Enrolled Candidates</span>
                        <span className="text-indigo-600 font-bold">{c.studentCount} Students</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Create Cohort Form */}
            <div>
              <Card className="border-gray-200 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-gray-900">
                    ➕ Create Curricular Cohort
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCohort} className="space-y-4">
                    <div>
                      <label htmlFor="cohortName" className="block text-xs font-semibold text-gray-700 mb-1">
                        Cohort Name:
                      </label>
                      <input
                        id="cohortName"
                        type="text"
                        value={newCohortName}
                        onChange={(e) => setNewCohortName(e.target.value)}
                        placeholder="e.g. Class of 2027 - Advanced AI"
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="cohortProgram" className="block text-xs font-semibold text-gray-700 mb-1">
                        Degree Program:
                      </label>
                      <select
                        id="cohortProgram"
                        value={newCohortProgram}
                        onChange={(e) => setNewCohortProgram(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option>M.S. Computer Science</option>
                        <option>B.S. Software Engineering</option>
                        <option>M.S. Data Science</option>
                        <option>Career Transition Bootcamp</option>
                      </select>
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                      Register Institutional Cohort
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Roster */}
        {activeTab === 'ROSTER' && (
          <Card className="border-gray-200 shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900">
                  Institutional Member Directory ({members.length})
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Tenant Isolation Verified
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Member Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Institutional Role</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-gray-900">{m.name}</td>
                        <td className="p-3 text-gray-500 font-mono text-[11px]">{m.email}</td>
                        <td className="p-3">
                          <Badge className="text-[10px]" variant={m.role === 'OWNER' ? 'default' : 'outline'}>
                            {m.role}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-600">{m.department}</td>
                        <td className="p-3 text-gray-400">{m.joinedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Invites */}
        {activeTab === 'INVITES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <Card className="border-gray-200 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-gray-900">
                    ✉️ Issue Cryptographic Invitation Token
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleIssueInvitation} className="space-y-4">
                    <div>
                      <label htmlFor="inviteEmail" className="block text-xs font-semibold text-gray-700 mb-1">
                        Invitee Email:
                      </label>
                      <input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@stanford.edu"
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="inviteRole" className="block text-xs font-semibold text-gray-700 mb-1">
                        Assigned Role:
                      </label>
                      <select
                        id="inviteRole"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="CANDIDATE">CANDIDATE (Student)</option>
                        <option value="FACULTY">FACULTY (Instructor / Advisor)</option>
                        <option value="CAREER_ADMIN">CAREER_ADMIN (Placement Lead)</option>
                        <option value="RECRUITER">RECRUITER (Hiring Partner)</option>
                        <option value="ADMIN">ADMIN (Institutional Admin)</option>
                      </select>
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                      Generate Cryptographic Invite Token
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-7">
              <Card className="border-gray-200 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-gray-900">
                    Active Invitation Tokens ({issuedTokens.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {issuedTokens.map((t, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900">{t.email}</span>
                        <Badge variant="outline" className="text-[10px]">
                          Role: {t.role}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono bg-white p-2 rounded border border-gray-200 text-gray-600">
                        <span className="truncate max-w-[280px]">{t.token}</span>
                        <button
                          onClick={() => navigator.clipboard?.writeText(t.token)}
                          className="text-indigo-600 font-sans text-xs font-semibold hover:underline shrink-0 ml-2"
                        >
                          Copy Token
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'SETTINGS' && (
          <Card className="border-gray-200 shadow-xs max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-900">
                Institutional Domain & Security Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="allowedDomains" className="block text-xs font-semibold text-gray-700 mb-1">
                  Allowed Email Domains (CSV):
                </label>
                <input
                  id="allowedDomains"
                  type="text"
                  defaultValue="stanford.edu, alumni.stanford.edu"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Self-registration will strictly require email matching these domain suffixes.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-bold text-gray-900">Allow Student Self-Enrollment</div>
                  <div className="text-[10px] text-gray-500">Students with verified domain emails can automatically join cohort rosters.</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 w-4 h-4" />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button size="sm" className="bg-indigo-600 text-white text-xs">
                  Save Institutional Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
