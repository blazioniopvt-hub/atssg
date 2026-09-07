'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { skillGraphApi, skillIntelligenceApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Button } from '@skillsync/ui';
import { Input } from '@skillsync/ui';
import { Badge } from '@skillsync/ui';
import Link from 'next/link';

interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
  isVerified: boolean;
  demandLevel: string;
}

export default function SkillsExplorerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const categories = [
    'PROGRAMMING',
    'DATA_SCIENCE',
    'DESIGN',
    'MARKETING',
    'PRODUCT',
    'MANAGEMENT',
    'SALES',
    'OPERATIONS',
    'FINANCE',
    'HR',
    'LEGAL',
    'OTHER',
  ];

  const fetchSkills = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: pageSize, offset: (currentPage - 1) * pageSize };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await skillGraphApi.listSkills(params);
      setSkills(res.data.skills);
      setTotalPages(Math.ceil(res.data.total / pageSize));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth/login';
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchSkills();
    }
  }, [user, searchQuery, categoryFilter, currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSkills();
  };

  const formatCategory = (cat: string) => cat.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skill Catalog Explorer</h1>
            <p className="text-sm text-gray-500">Discover skills, view prerequisite graphs, and map relationships across the SkillSync knowledge base</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Skill Directory</CardTitle>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                placeholder="Search skills by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64"
              />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                  fetchSkills();
                }}
                className="px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatCategory(cat)}
                  </option>
                ))}
              </select>
            </form>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
              </div>
            ) : skills.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium mb-1">No skills found</p>
                <p className="text-xs">Try adjusting your search query or category filter</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {skills.map((skill) => (
                    <Link key={skill.id} href={`/skills/${skill.slug}`} className="block group">
                      <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition-all duration-200 space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-gray-900 truncate text-base group-hover:text-primary-600 transition-colors">{skill.name}</h3>
                          {skill.isVerified && (
                            <span className="shrink-0 ml-2" title="Verified Skill">
                              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="capitalize text-xs">
                            {formatCategory(skill.category)}
                          </Badge>
                          {skill.subcategory && (
                            <Badge variant="secondary" className="capitalize text-xs">
                              {skill.subcategory.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                          <Badge variant={skill.demandLevel === 'HIGH' || skill.demandLevel === 'CRITICAL' ? 'default' : 'secondary'} className="text-[10px]">
                            Demand: {skill.demandLevel}
                          </Badge>
                          <span className="text-primary-600 font-semibold group-hover:translate-x-0.5 transition-transform">Details →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 text-xs font-semibold text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}