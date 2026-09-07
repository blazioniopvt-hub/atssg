'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { skillIntelligenceApi, SkillIntelligenceItem } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@skillsync/ui';

export default function EvidencePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [userSkills, setUserSkills] = useState<SkillIntelligenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Evidence Form State
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [evidenceType, setEvidenceType] = useState('PROJECT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadSkillsData();
    }
  }, [user, authLoading, router]);

  const loadSkillsData = async () => {
    setLoading(true);
    try {
      const res = await skillIntelligenceApi.getSkills();
      if (res.data) {
        setUserSkills(res.data);
        if (res.data.length > 0) {
          setSelectedSkillId(res.data[0].skill?.id || res.data[0].skillId || '');
        }
      }
    } catch (err) {
      console.error('Error loading skills for evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId || !title.trim()) {
      setErrorMsg('Please select a skill and provide a title.');
      return;
    }

    const item = userSkills.find((s) => (s.skill?.id || s.skillId) === selectedSkillId);
    const userSkillId = item?.userSkill?.id || item?.id;

    if (!userSkillId) {
      setErrorMsg('Invalid user skill selected.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await skillIntelligenceApi.addEvidence(selectedSkillId, {
        userSkillId,
        type: evidenceType,
        title: title.trim(),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
      });

      setSuccessMsg('Evidence attached successfully! Your skill confidence has been updated.');
      setTitle('');
      setDescription('');
      setUrl('');
      await loadSkillsData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to attach evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
      </main>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skill Evidence Portfolio</h1>
          <p className="text-sm text-gray-500">Attach real-world projects, certifications, assessments, and experience to increase skill confidence scores.</p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Evidence Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900">Attach New Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-xs text-gray-400">Loading user skills...</p>
                ) : userSkills.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-500 mb-3">Add skills to your profile first before attaching evidence.</p>
                    <Button size="sm" onClick={() => router.push('/skills')}>Add Skills First</Button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateEvidence} className="space-y-4">
                    <div>
                      <label htmlFor="target-skill-select" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Select Target Skill
                      </label>
                      <select
                        id="target-skill-select"
                        value={selectedSkillId}
                        onChange={(e) => setSelectedSkillId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        {userSkills.map((s, idx) => {
                          const sid = s.skill?.id || s.skillId || `skill-${idx}`;
                          return (
                            <option key={sid} value={sid}>
                              {s.skill?.name || sid} ({s.userSkill?.proficiencyLevel || 'Level'})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="evidence-type-select" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Evidence Type
                      </label>
                      <select
                        id="evidence-type-select"
                        value={evidenceType}
                        onChange={(e) => setEvidenceType(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        <option value="PROJECT">Project Demonstration</option>
                        <option value="CERTIFICATE">Official Certification</option>
                        <option value="ASSESSMENT_RESULT">Assessment Result</option>
                        <option value="WORK_EXPERIENCE">Work Experience</option>
                        <option value="PORTFOLIO_ITEM">Portfolio Item</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="evidence-title-input" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Evidence Title
                      </label>
                      <input
                        id="evidence-title-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. SkillSync Production Architecture Engine"
                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="evidence-desc-textarea" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Description / Impact
                      </label>
                      <textarea
                        id="evidence-desc-textarea"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Key responsibilities, technical highlights, or achievements..."
                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="evidence-url-input" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Reference URL (Optional)
                      </label>
                      <input
                        id="evidence-url-input"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://github.com/yourproject"
                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full justify-center">
                      {submitting ? 'Attaching Evidence...' : 'Attach Evidence'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Evidence Inventory */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900">Your Evidence Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-xs text-gray-400 text-center py-6">Loading evidence portfolio...</p>
                ) : userSkills.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No skills found.</p>
                ) : (
                  <div className="space-y-6">
                    {userSkills.map((item, idx) => (
                      <div key={item.skill?.id || item.skillId || idx} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">{item.skill?.name}</h3>
                            <span className="text-xs text-gray-500 capitalize">{item.userSkill?.proficiencyLevel?.toLowerCase()}</span>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs font-semibold">
                              Score: {Math.round((item.intelligence?.score || 0) * 100)}%
                            </Badge>
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              {item.evidenceTypes?.join(', ') || 'SELF_REPORTED'}
                            </span>
                          </div>
                        </div>

                        {/* Evidence Items List */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attached Proof ({item.evidenceCount || 1})</p>
                          <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">Self-reported skill declaration</span>
                              <Badge variant="secondary" className="text-[10px]">SELF_REPORTED</Badge>
                            </div>
                            <p className="text-gray-500">Initial skill profile entry at {item.userSkill?.proficiencyLevel || 'INTERMEDIATE'} level.</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
