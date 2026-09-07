'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

import { AppShell } from '@/components/layout/AppShell';
import { EvidenceList } from '@/components/skill-intelligence/EvidenceList';
import { SkillIntelligenceCard } from '@/components/skill-intelligence/SkillIntelligenceCard';
import { SkillIntelligenceSummaryComponent } from '@/components/skill-intelligence/SkillIntelligenceSummary';
import { skillIntelligenceApi, SkillIntelligenceItem, SkillIntelligenceSummary, EvidenceType } from '@/lib/api';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@skillsync/ui';

export default function SkillIntelligencePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [summary, setSummary] = useState<SkillIntelligenceSummary | null>(null);
  const [skills, setSkills] = useState<SkillIntelligenceItem[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillIntelligenceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [proficiencyFilter, setProficiencyFilter] = useState<string>('all');
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ skillId: '', proficiencyLevel: 'BEGINNER', yearsOfExperience: 0 });

  const fetchData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [summaryRes, skillsRes] = await Promise.all([
        skillIntelligenceApi.getSummary(),
        skillIntelligenceApi.getSkills(),
      ]);
      setSummary(summaryRes.data);
      setSkills(skillsRes.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skill intelligence');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleUpdateSkill = async (skillId: string, data: { proficiencyLevel?: string; yearsOfExperience?: number }) => {
    try {
      await skillIntelligenceApi.updateSkill(skillId, data);
      await fetchData();
    } catch (err) {
      console.error('Failed to update skill:', err);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!confirm('Are you sure you want to remove this skill from your profile?')) return;
    try {
      await skillIntelligenceApi.removeSkill(skillId);
      await fetchData();
    } catch (err) {
      console.error('Failed to remove skill:', err);
    }
  };

  const handleAddEvidence = async (data: { type: string; title: string; description?: string; url?: string }) => {
    if (!selectedSkill) return;
    await skillIntelligenceApi.addEvidence(selectedSkill.userSkill.id, {
      userSkillId: selectedSkill.userSkill.id,
      type: data.type as EvidenceType,
      title: data.title,
      description: data.description,
      url: data.url,
    });
    await fetchData();
  };

  const handleUpdateEvidence = async (evidenceId: string, data: { title?: string; description?: string; url?: string }) => {
    await skillIntelligenceApi.updateEvidence(evidenceId, data);
    await fetchData();
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    await skillIntelligenceApi.deleteEvidence(evidenceId);
    await fetchData();
  };

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.skill.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProficiency = proficiencyFilter === 'all' || skill.userSkill.proficiencyLevel === proficiencyFilter;
    return matchesSearch && matchesProficiency;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skill Intelligence Engine</h1>
            <p className="text-sm text-gray-500">Analyze and manage your skill proficiency with evidence-backed confidence calculations</p>
          </div>
          <Button onClick={() => setIsAddingSkill(!isAddingSkill)}>
            {isAddingSkill ? 'Cancel' : 'Add Skill'}
          </Button>
        </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && <SkillIntelligenceSummaryComponent summary={summary} />}

      {/* Skills Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Your Skills</CardTitle>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <select
              value={proficiencyFilter}
              onChange={(e) => setProficiencyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Proficiencies</option>
              <option value="EXPERT">Expert</option>
              <option value="ADVANCED">Advanced</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="BEGINNER">Beginner</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium mb-2">No skills found</p>
              <p className="text-sm">Add skills to your profile to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSkills.map((skill) => (
                <SkillIntelligenceCard
                  key={skill.skill.id}
                  item={skill}
                  onClick={() => setSelectedSkill(skill)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedSkill.skill.name}</h2>
                <p className="text-gray-500 mt-1">{selectedSkill.skill.category}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedSkill(null)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Skill Header Info */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-lg font-semibold text-gray-900">{selectedSkill.skill.name}</span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  {selectedSkill.skill.category}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-gray-900">{Math.round(selectedSkill.intelligence.score * 100)}%</p>
                  <p className="text-xs text-gray-500">Confidence Score</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-gray-900">{selectedSkill.evidenceCount}</p>
                  <p className="text-xs text-gray-500">Evidence Items</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-gray-900">{selectedSkill.userSkill.yearsOfExperience ?? 0}</p>
                  <p className="text-xs text-gray-500">Years Experience</p>
                </div>
              </div>

              {/* Proficiency & Verification */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  Proficiency: {selectedSkill.userSkill.proficiencyLevel}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedSkill.userSkill.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                  selectedSkill.userSkill.verificationStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                } border`}>
                  {selectedSkill.userSkill.verificationStatus}
                </span>
              </div>

              {/* Evidence Types */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Evidence Types</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSkill.evidenceTypes.map((type) => (
                    <Badge key={type} variant="outline" className="capitalize">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Evidence List */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Evidence</h3>
                <EvidenceList
                  userSkillId={selectedSkill.userSkill.id}
                  evidence={[]} // Will be fetched in the component
                  onAddEvidence={handleAddEvidence}
                  onUpdateEvidence={handleUpdateEvidence}
                  onDeleteEvidence={handleDeleteEvidence}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => handleUpdateSkill(selectedSkill.skill.id, { proficiencyLevel: 'ADVANCED' })}>
                  Update Proficiency
                </Button>
                <Button variant="destructive" onClick={() => { handleRemoveSkill(selectedSkill.skill.id); setSelectedSkill(null); }}>
                  Remove Skill
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}