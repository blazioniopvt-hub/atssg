'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { aiApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Button } from '@skillsync/ui';
import { Input } from '@skillsync/ui';
import { Textarea } from '@skillsync/ui';

export default function AIExtractPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [text, setText] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth/login';
    }
  }, [user, authLoading]);

  const handleAnalyze = async () => {
    if (!text.trim() || text.length < 10) {
      setError('Please enter at least 10 characters of text to analyze.');
      return;
    }

    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const result = await aiApi.extractSkills({ text, context });
      setResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkillToggle = (skillName: string) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillName)) {
        next.delete(skillName);
      } else {
        next.add(skillName);
      }
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!result || selectedSkills.size === 0) return;

    setIsSubmitting(true);
    try {
      const skillsToAdd = result.skills
        .filter((s: any) => selectedSkills.has(s.originalName) && s.normalized.matched && s.normalized.matchedSkillId)
        .map((s: any) => ({
          skillId: s.normalized.matchedSkillId!,
          proficiencyLevel: 'BEGINNER' as const,
          yearsOfExperience: 0,
        }));

      for (const skill of skillsToAdd) {
        await fetch('/api/skill-intelligence/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(skill),
        });
      }

      // Clear selection and result
      setSelectedSkills(new Set());
      setResult(null);
      setText('');
    } catch (err) {
      alert('Failed to add skills: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkillSelect = (skill: any) => {
    if (skill.normalized.matched) {
      handleSkillToggle(skill.originalName);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Skill Analysis</h1>
        <p className="text-gray-600 mt-1">
          Paste your experience, project descriptions, or resume text to extract skills with AI assistance.
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enter Your Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="experience-text" className="block text-sm font-medium text-gray-700 mb-2">
              Your Experience / Project Description / Resume Text
            </label>
            <Textarea
              id="experience-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="e.g., I built a computer vision attendance system using Python, OpenCV, and TensorFlow for my university capstone project. I also have 2 years of experience with React and TypeScript building scalable web applications."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">
              {text.length}/50000 characters (minimum 10 characters)
            </p>
          </div>

          <div>
            <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Context (optional)
            </label>
            <Input
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., This is from my senior capstone project / my current job / my portfolio"
              className="w-full"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || text.length < 10}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Skills'}
            </Button>
            {result && (
              <Button variant="outline" onClick={() => setResult(null)}>
                Clear Results
              </Button>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="text-lg">Analysis Results</div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{result.skills.length} skill(s) found</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">Latency: {result.latencyMs}ms</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {result.skills.map((skill: any) => (
                <div
                  key={skill.originalName}
                  onClick={() => handleSkillSelect(skill)}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${
                    selectedSkills.has(skill.originalName)
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                      : 'border-gray-200 hover:border-primary-300'
                  } ${!skill.normalized.matched ? 'opacity-75' : ''}
                `}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSkillSelect(skill);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={selectedSkills.has(skill.originalName)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-gray-900 truncate">{skill.originalName}</span>
                      {skill.normalized.matched && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Matched: {skill.normalized.matchedSkillName}
                        </span>
                      )}
                      {!skill.normalized.matched && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Unmatched
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{skill.reason}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded text-gray-700 bg-gray-100">
                        Extraction: {Math.round(skill.extractionConfidence * 100)}%
                      </span>
                      <span className="px-2 py-0.5 rounded text-gray-700 bg-gray-100">
                        Match: {Math.round(skill.normalized.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedSkills.has(skill.originalName)}
                      onChange={() => handleSkillToggle(skill.originalName)}
                      disabled={!skill.normalized.matched}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      aria-label={`Select ${skill.originalName}`}
                    />
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{skill.evidence}</p>
                </div>
              </div>
            ))}

            {result.skills.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium mb-2">No skills found</p>
                <p className="text-sm">The AI couldn&apos;t identify any clear skills in your text.</p>
              </div>
            )}
          </div>

          {selectedSkills.size > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={handleAddSelected}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Adding Skills...' : `Add ${selectedSkills.size} Selected Skill(s) to Profile`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Instructions */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="space-y-3">
          <h3 className="font-semibold text-gray-900">How to get the best results:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Include specific technologies, frameworks, and tools you used</li>
            <li>Mention years of experience or project duration when possible</li>
            <li>Describe the domain (e.g., "computer vision", "backend development", "data analysis")</li>
            <li>Avoid vague statements like "I want to learn..." or "I'm interested in..."</li>
            <li>The AI will only extract skills explicitly supported by your text</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Note: AI suggestions require your explicit confirmation before being added to your profile.
            The AI confidence score reflects how strongly the text supports the skill, not your actual proficiency.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}