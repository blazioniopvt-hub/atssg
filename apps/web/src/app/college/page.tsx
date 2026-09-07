'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@skillsync/ui';

interface SkillDistributionItem {
  name: string;
  count: number;
  percentage: number;
  category: string;
}

interface IndustrySkillGap {
  skill: string;
  studentCoverage: number;
  industryDemand: number;
  gap: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface DepartmentBreakdown {
  department: string;
  students: number;
  avgConfidence: number;
  placementReadiness: string;
}

interface CollegeAnalyticsData {
  institution: string;
  totalStudents: number;
  activeProfiles: number;
  verifiedEvidenceCount: number;
  topSkillsDistribution: SkillDistributionItem[];
  industrySkillGaps: IndustrySkillGap[];
  departmentBreakdown: DepartmentBreakdown[];
}

const DEFAULT_COLLEGE_ANALYTICS: CollegeAnalyticsData = {
  institution: 'Stanford University - School of Engineering',
  totalStudents: 480,
  activeProfiles: 412,
  verifiedEvidenceCount: 1240,
  topSkillsDistribution: [
    { name: 'TypeScript', count: 320, percentage: 78, category: 'PROGRAMMING' },
    { name: 'Python', count: 285, percentage: 69, category: 'DATA_SCIENCE' },
    { name: 'React', count: 250, percentage: 61, category: 'PROGRAMMING' },
    { name: 'PostgreSQL', count: 190, percentage: 46, category: 'PROGRAMMING' },
    { name: 'PyTorch / AI', count: 165, percentage: 40, category: 'DATA_SCIENCE' },
    { name: 'Docker & DevOps', count: 140, percentage: 34, category: 'OPERATIONS' },
  ],
  industrySkillGaps: [
    { skill: 'Cloud Infrastructure (AWS/GCP)', studentCoverage: 28, industryDemand: 82, gap: 54, priority: 'HIGH' },
    { skill: 'RAG & Vector Databases', studentCoverage: 32, industryDemand: 76, gap: 44, priority: 'HIGH' },
    { skill: 'System Observability & Monitoring', studentCoverage: 18, industryDemand: 60, gap: 42, priority: 'MEDIUM' },
    { skill: 'GraphQL & API Design', studentCoverage: 45, industryDemand: 70, gap: 25, priority: 'LOW' },
  ],
  departmentBreakdown: [
    { department: 'Computer Science', students: 280, avgConfidence: 86, placementReadiness: '92%' },
    { department: 'Data Science & AI', students: 120, avgConfidence: 84, placementReadiness: '88%' },
    { department: 'Electrical Engineering', students: 80, avgConfidence: 76, placementReadiness: '79%' },
  ],
};

export default function CollegePage() {
  const [data, setData] = useState<CollegeAnalyticsData>(DEFAULT_COLLEGE_ANALYTICS);
  const [selectedCohort, setSelectedCohort] = useState('ALL');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/organizations/default/analytics`, {
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setData((prev) => ({
              ...prev,
              totalStudents: json.data.totalStudents || prev.totalStudents,
              activeProfiles: json.data.activeProfiles || prev.activeProfiles,
              verifiedEvidenceCount: json.data.verifiedEvidenceCount || prev.verifiedEvidenceCount,
              topSkillsDistribution: json.data.topSkillsDistribution || prev.topSkillsDistribution,
              industrySkillGaps: json.data.industrySkillGaps || prev.industrySkillGaps,
              departmentBreakdown: json.data.departmentBreakdown || prev.departmentBreakdown,
            }));
          }
        }
      } catch {
        // Use demo fallback
      }
    }
    loadAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                🏛️ Institutional Intelligence
              </Badge>
              <span className="text-xs text-gray-400">● {data.institution}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Institutional Skill Distribution & Industry Alignment
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time analytics on student skill mastery, verified evidence portfolios, and curriculum gaps relative to market demand.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="text-xs bg-white">
              📥 Export Placement Report (PDF)
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-xs">
            <CardContent className="p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Enrolled Cohort</span>
              <div className="text-3xl font-extrabold text-gray-900 mt-1">{data.totalStudents}</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">
                {data.activeProfiles} active verified profiles ({Math.round((data.activeProfiles / data.totalStudents) * 100)}%)
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-xs">
            <CardContent className="p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Verified Evidence</span>
              <div className="text-3xl font-extrabold text-indigo-600 mt-1">{data.verifiedEvidenceCount}</div>
              <div className="text-xs text-indigo-600 font-medium mt-1">Projects, Certs & AST Proofs</div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-xs">
            <CardContent className="p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Skill Confidence</span>
              <div className="text-3xl font-extrabold text-purple-600 mt-1">86%</div>
              <div className="text-xs text-purple-600 font-medium mt-1">Diminishing-returns score</div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-xs">
            <CardContent className="p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Placement Readiness</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1">92%</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">Tier-1 Industry Aligned</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Skill Distribution */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-900">
                Cohort Skill Mastery Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.topSkillsDistribution.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900">{item.name}</span>
                    <span className="text-gray-500 font-medium">{item.count} Students ({item.percentage}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Industry Skill Gap Heatmap */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-900">
                Industry Curriculum Alignment & Skill Gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.industrySkillGaps.map((gap, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">{gap.skill}</span>
                    <Badge
                      className={
                        gap.priority === 'HIGH'
                          ? 'bg-rose-100 text-rose-700 border-rose-200 text-[10px]'
                          : 'bg-amber-100 text-amber-700 border-amber-200 text-[10px]'
                      }
                    >
                      {gap.priority} PRIORITY GAP
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <div className="text-[10px] text-gray-400">Student Mastery</div>
                      <div className="font-bold text-gray-700">{gap.studentCoverage}%</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <div className="text-[10px] text-gray-400">Industry Demand</div>
                      <div className="font-bold text-indigo-600">{gap.industryDemand}%</div>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <div className="text-[10px] text-rose-500">Skill Gap</div>
                      <div className="font-bold text-rose-700">-{gap.gap}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Department Readiness Table */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-gray-900">
              Department Cohort Readiness Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="p-3">Department</th>
                    <th className="p-3">Students</th>
                    <th className="p-3">Avg Skill Confidence</th>
                    <th className="p-3">Placement Readiness</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.departmentBreakdown.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-gray-900">{dept.department}</td>
                      <td className="p-3 text-gray-600">{dept.students} Active</td>
                      <td className="p-3 font-semibold text-purple-600">{dept.avgConfidence}%</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          {dept.placementReadiness}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" className="text-xs text-indigo-600">
                          View Roster →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
