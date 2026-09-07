'use client';

import React, { useState } from 'react';
import { SkillEvidence, EvidenceType } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Button } from '@skillsync/ui';
import { Input } from '@skillsync/ui';
import { EvidenceTypeBadge } from './Badges';

interface EvidenceListProps {
  evidence: SkillEvidence[];
  userSkillId: string;
  onAddEvidence: (data: { type: EvidenceType; title: string; description?: string; url?: string }) => Promise<void>;
  onUpdateEvidence: (evidenceId: string, data: { title?: string; description?: string; url?: string }) => Promise<void>;
  onDeleteEvidence: (evidenceId: string) => Promise<void>;
  isLoading?: boolean;
}

const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: 'PROJECT' as EvidenceType, label: 'Project' },
  { value: 'CERTIFICATE' as EvidenceType, label: 'Certificate' },
  { value: 'PORTFOLIO_ITEM' as EvidenceType, label: 'Portfolio Item' },
  { value: 'EXPERIENCE' as EvidenceType, label: 'Work Experience' },
  { value: 'ASSESSMENT_RESULT' as EvidenceType, label: 'Assessment Result' },
  { value: 'OTHER' as EvidenceType, label: 'Other' },
];

export function EvidenceList({
  evidence,
  userSkillId,
  onAddEvidence,
  onUpdateEvidence,
  onDeleteEvidence,
  isLoading,
}: EvidenceListProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'PROJECT' as EvidenceType,
    title: '',
    description: '',
    url: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: '', description: '', url: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAddEvidence(formData);
      setFormData({ type: 'PROJECT' as EvidenceType, title: '', description: '', url: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add evidence:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent, evidenceId: string) => {
    e.preventDefault();
    try {
      await onUpdateEvidence(evidenceId, editData);
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update evidence:', error);
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (confirm('Are you sure you want to delete this evidence?')) {
      try {
        await onDeleteEvidence(evidenceId);
      } catch (error) {
        console.error('Failed to delete evidence:', error);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Evidence ({evidence.length})</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          Add Evidence
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="evidence-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence Type
                </label>
                <select
                  id="evidence-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EvidenceType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {EVIDENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="evidence-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  id="evidence-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Computer Vision Attendance System"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="evidence-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="evidence-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe how this demonstrates the skill..."
              />
            </div>
            <div>
              <label htmlFor="evidence-url" className="block text-sm font-medium text-gray-700 mb-1">
                URL (optional)
              </label>
              <Input
                id="evidence-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://github.com/... or https://example.com/certificate"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading || !formData.title.trim()}>
                {isLoading ? 'Adding...' : 'Add Evidence'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {evidence.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No evidence added yet</p>
            <p className="text-sm">Add evidence to increase your skill confidence</p>
          </div>
        )}

        <div className="space-y-3">
          {evidence.map((item) => (
            <EvidenceItem
              key={item.id}
              item={item}
              editingId={editingId}
              editData={editData}
              onEditClick={() => {
                setEditingId(item.id);
                setEditData({ title: item.title, description: item.description ?? '', url: item.url ?? '' });
              }}
              onEditCancel={() => setEditingId(null)}
              onEditSubmit={(e) => handleEditSubmit(e, item.id)}
              onDelete={() => handleDelete(item.id)}
              onEditChange={(field, value) => setEditData({ ...editData, [field]: value })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface EvidenceItemProps {
  item: SkillEvidence;
  editingId: string | null;
  editData: { title: string; description: string; url: string };
  onEditClick: () => void;
  onEditCancel: () => void;
  onEditSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onEditChange: (field: string, value: string) => void;
}

function EvidenceItem({
  item,
  editingId,
  editData,
  onEditClick,
  onEditCancel,
  onEditSubmit,
  onDelete,
  onEditChange,
}: EvidenceItemProps) {
  const isEditing = editingId === item.id;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
            <EvidenceTypeBadge type={item.type} />
            {item.verifiedAt && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                Verified
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" variant="outline" onClick={onEditCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={(e) => { e.preventDefault(); onEditSubmit(e); }}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={onEditClick}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={onDelete}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <form onSubmit={onEditSubmit} className="space-y-3 pt-3 border-t border-gray-100">
          <div>
            <label htmlFor={`edit-title-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <Input
              id={`edit-title-${item.id}`}
              value={editData.title}
              onChange={(e) => onEditChange('title', e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`edit-description-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id={`edit-description-${item.id}`}
              value={editData.description}
              onChange={(e) => onEditChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label htmlFor={`edit-url-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <Input
              id={`edit-url-${item.id}`}
              type="url"
              value={editData.url}
              onChange={(e) => onEditChange('url', e.target.value)}
            />
          </div>
        </form>
      )}
    </div>
  );
}