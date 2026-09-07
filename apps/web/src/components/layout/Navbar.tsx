'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button, Badge } from '@skillsync/ui';

export type PersonaMode = 'STUDENT' | 'EMPLOYER' | 'COLLEGE';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [activePersona, setActivePersona] = useState<PersonaMode>(() => {
    if (pathname.startsWith('/employer')) return 'EMPLOYER';
    if (pathname.startsWith('/college')) return 'COLLEGE';
    return 'STUDENT';
  });

  const getPersonaLinks = () => {
    switch (activePersona) {
      case 'EMPLOYER':
        return [
          { name: 'Talent Discovery', href: '/employer' },
          { name: 'Required Skills Match', href: '/employer#matches' },
          { name: 'Evidence Verification', href: '/employer#evidence' },
          { name: 'Opportunities', href: '/employer#opportunities' },
        ];
      case 'COLLEGE':
        return [
          { name: 'Institutional Analytics', href: '/college' },
          { name: 'Skill Distributions', href: '/college#distribution' },
          { name: 'Industry Gaps', href: '/college#gaps' },
          { name: 'Department Reports', href: '/college#departments' },
        ];
      case 'STUDENT':
      default:
        return [
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Skill Intelligence', href: '/skill-intelligence' },
          { name: 'Evidence Portfolio', href: '/evidence' },
          { name: 'Resume AI', href: '/resumes' },
          { name: 'Learning Path', href: '/learning' },
        ];
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                ⚡
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Skill<span className="text-indigo-600">Sync</span>
                </span>
                <span className="text-[10px] font-medium text-gray-400 -mt-1 tracking-wider uppercase">
                  Talent Intelligence
                </span>
              </div>
            </Link>

            {/* Persona Switcher Tabs */}
            <div className="hidden lg:flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80">
              <button
                type="button"
                onClick={() => setActivePersona('STUDENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activePersona === 'STUDENT'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setActivePersona('EMPLOYER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activePersona === 'EMPLOYER'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🏢 Employer
              </button>
              <button
                type="button"
                onClick={() => setActivePersona('COLLEGE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activePersona === 'COLLEGE'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🏛️ College
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {getPersonaLinks().map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Auth & Demo Controls */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:flex bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-1">
              ● Investor Demo Mode
            </Badge>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-700 hidden sm:inline-block">
                  {user.displayName || user.email}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => logout()}
                  className="text-xs border-gray-300 hover:bg-gray-100"
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button size="sm" variant="ghost" className="text-xs">
                    Sign in
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Persona Bar */}
        <div className="flex lg:hidden items-center justify-center gap-2 pb-3 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setActivePersona('STUDENT')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activePersona === 'STUDENT' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-500'
            }`}
          >
            🎓 Student
          </button>
          <button
            type="button"
            onClick={() => setActivePersona('EMPLOYER')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activePersona === 'EMPLOYER' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-500'
            }`}
          >
            🏢 Employer
          </button>
          <button
            type="button"
            onClick={() => setActivePersona('COLLEGE')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activePersona === 'COLLEGE' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-500'
            }`}
          >
            🏛️ College
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
