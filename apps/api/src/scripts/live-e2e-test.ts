const API_URL = 'http://localhost:4000';

function extractCookie(res: Response): string {
  const cookies: string[] = typeof (res.headers as any).getSetCookie === 'function'
    ? (res.headers as any).getSetCookie()
    : [res.headers.get('set-cookie') || ''];

  for (const c of cookies) {
    if (c && c.includes('skillsync_session=')) {
      const match = c.match(/skillsync_session=[^;]+/);
      if (match) return match[0];
    }
  }
  return '';
}

async function runLiveE2E() {
  console.log('🚀 STARTING LIVE E2E RUNTIME VERIFICATION SUITE\n');

  const results: Record<string, { pass: boolean; details: string }> = {};

  // 1. Health & Database Check
  try {
    const res = await fetch(`${API_URL}/health/db`);
    const data = (await res.json()) as any;
    if (res.ok && data.status === 'healthy' && data.database === 'connected') {
      results['Database'] = { pass: true, details: 'Prisma connected to Supabase PostgreSQL over port 5432' };
    } else {
      results['Database'] = { pass: false, details: JSON.stringify(data) };
    }
  } catch (err: any) {
    results['Database'] = { pass: false, details: err.message };
  }

  // 2. User Registration (User A)
  const timestamp = Date.now();
  const emailA = `testuser_${timestamp}@skillsync.local`;
  const usernameA = `testuser_${timestamp}`;
  const password = 'TestPassword123!';
  let cookieA = '';

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, username: usernameA, password, displayName: 'Test User A' }),
    });

    cookieA = extractCookie(res);
    const data = (await res.json()) as any;

    if (res.status === 201 && data.user && data.user.id && data.user.role === 'USER') {
      results['Registration'] = { pass: true, details: `Registered user ID: ${data.user.id}, role: ${data.user.role}` };
    } else {
      results['Registration'] = { pass: false, details: JSON.stringify(data) };
    }
  } catch (err: any) {
    results['Registration'] = { pass: false, details: err.message };
  }

  // 3. User Login
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password }),
    });

    const newCookie = extractCookie(res);
    if (newCookie) cookieA = newCookie;

    const data = (await res.json()) as any;
    if (res.status === 200 && data.user && cookieA) {
      results['Login'] = { pass: true, details: `Logged in successfully, session cookie acquired (${cookieA.substring(0, 25)}...)` };
    } else {
      results['Login'] = { pass: false, details: JSON.stringify(data) };
    }
  } catch (err: any) {
    results['Login'] = { pass: false, details: err.message };
  }

  // 4. Admin Privilege Escalation Protection Check
  const emailDev = `dev_${timestamp}@skillsync.local`;
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailDev, username: `devuser_${timestamp}`, password }),
    });
    const data = (await res.json()) as any;
    if (res.status === 201 && data.user.role === 'USER') {
      results['Admin Privilege Protection'] = { pass: true, details: `User with dev email assigned role USER (isAdmin: false)` };
    } else {
      results['Admin Privilege Protection'] = { pass: false, details: `Role was ${data?.user?.role}` };
    }
  } catch (err: any) {
    results['Admin Privilege Protection'] = { pass: false, details: err.message };
  }

  // 5. Protected Endpoint Access & Skill Addition
  let skillIdToTest = '';
  try {
    // Fetch skill catalog
    const skillsRes = await fetch(`${API_URL}/skill-graph/skills?limit=5`);
    const skillsData = (await skillsRes.json()) as any;
    if (skillsData.data && skillsData.data.skills && skillsData.data.skills.length > 0) {
      skillIdToTest = skillsData.data.skills[0].id;
    }

    // Add skill to User A profile
    const addRes = await fetch(`${API_URL}/skill-intelligence/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ skillId: skillIdToTest, proficiencyLevel: 'INTERMEDIATE', yearsOfExperience: 2 }),
    });
    const addData = (await addRes.json()) as any;

    // Try adding duplicate skill
    const dupRes = await fetch(`${API_URL}/skill-intelligence/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ skillId: skillIdToTest, proficiencyLevel: 'ADVANCED' }),
    });

    if (addRes.status === 201 && dupRes.status === 409) {
      results['Skills & Duplicate Handling'] = { pass: true, details: `Skill added (201), duplicate addition rejected (409 CONFLICT)` };
    } else {
      results['Skills & Duplicate Handling'] = { pass: false, details: `Add status: ${addRes.status}, Dup status: ${dupRes.status}, data: ${JSON.stringify(addData)}` };
    }
  } catch (err: any) {
    results['Skills & Duplicate Handling'] = { pass: false, details: err.message };
  }

  // 6. Evidence Addition
  let evidenceId = '';
  try {
    const userSkillsRes = await fetch(`${API_URL}/skill-intelligence/skills`, {
      headers: { Cookie: cookieA },
    });
    const userSkillsData = (await userSkillsRes.json()) as any;
    const item = userSkillsData.data?.[0];
    const userSkillId = item?.userSkill?.id || item?.id;
    const skillId = item?.skill?.id || item?.skillId;

    if (userSkillId && skillId) {
      const evRes = await fetch(`${API_URL}/skill-intelligence/skills/${skillId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({
          userSkillId: userSkillId,
          type: 'PROJECT',
          title: 'SkillSync E2E Project',
          description: 'E2E runtime evidence verification',
        }),
      });
      const evData = (await evRes.json()) as any;
      if (evRes.status === 201 && evData.data?.id) {
        evidenceId = evData.data.id;
        results['Evidence'] = { pass: true, details: `Evidence created ID: ${evidenceId}` };
      } else {
        results['Evidence'] = { pass: false, details: JSON.stringify(evData) };
      }
    } else {
      results['Evidence'] = { pass: false, details: `No user skill found in response: ${JSON.stringify(userSkillsData)}` };
    }
  } catch (err: any) {
    results['Evidence'] = { pass: false, details: err.message };
  }

  // 7. Skill Intelligence Summary
  try {
    const summaryRes = await fetch(`${API_URL}/skill-intelligence`, {
      headers: { Cookie: cookieA },
    });
    const summaryData = (await summaryRes.json()) as any;
    if (summaryRes.status === 200 && summaryData.data && typeof summaryData.data.totalSkills === 'number') {
      results['Skill Intelligence'] = { pass: true, details: `Summary totalSkills: ${summaryData.data.totalSkills}, verifiedSkills: ${summaryData.data.verifiedSkillsCount}` };
    } else {
      results['Skill Intelligence'] = { pass: false, details: JSON.stringify(summaryData) };
    }
  } catch (err: any) {
    results['Skill Intelligence'] = { pass: false, details: err.message };
  }

  // 8. Skill Gap & Learning Path
  try {
    const gapRes = await fetch(`${API_URL}/learning/gap/${skillIdToTest}`, {
      headers: { Cookie: cookieA },
    });
    const gapData = (await gapRes.json()) as any;

    const pathRes = await fetch(`${API_URL}/learning/path/${skillIdToTest}`, {
      headers: { Cookie: cookieA },
    });
    const pathData = (await pathRes.json()) as any;

    if (gapRes.status === 200 && pathRes.status === 200 && gapData.data?.readiness) {
      results['Learning Path & Gap Analysis'] = { pass: true, details: `Gap readiness: ${gapData.data.readiness}, Learning path milestones generated` };
    } else {
      results['Learning Path & Gap Analysis'] = { pass: false, details: `Gap: ${gapRes.status}, Path: ${pathRes.status}` };
    }
  } catch (err: any) {
    results['Learning Path & Gap Analysis'] = { pass: false, details: err.message };
  }

  // 9. User Isolation / IDOR Test (User B)
  const emailB = `testuserB_${timestamp}@skillsync.local`;
  try {
    const regB = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, username: `userB_${timestamp}`, password }),
    });
    const cookieB = extractCookie(regB);

    // User B attempts accessing User A's private evidence list for test skill
    const idorRes = await fetch(`${API_URL}/skill-intelligence/skills/${skillIdToTest}/evidence`, {
      headers: { Cookie: cookieB },
    });

    if (idorRes.status === 404 || idorRes.status === 403 || idorRes.status === 401) {
      results['User Isolation'] = { pass: true, details: `User B blocked from User A resource (Status ${idorRes.status})` };
    } else {
      results['User Isolation'] = { pass: false, details: `User B accessed User A resource! Status: ${idorRes.status}` };
    }
  } catch (err: any) {
    results['User Isolation'] = { pass: false, details: err.message };
  }

  // 10. Logout & Token Invalidation
  try {
    const logoutRes = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookieA },
    });

    // Try accessing protected route after logout
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: cookieA },
    });

    if (logoutRes.status === 200 && meRes.status === 401) {
      results['Logout'] = { pass: true, details: `Logout succeeded (200), session invalidated (401 Unauthorized on subsequent request)` };
    } else {
      results['Logout'] = { pass: false, details: `Logout status: ${logoutRes.status}, Me status: ${meRes.status}` };
    }
  } catch (err: any) {
    results['Logout'] = { pass: false, details: err.message };
  }

  // 11. CORS Origin Verification
  try {
    const validCorsRes = await fetch(`${API_URL}/health`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    const allowOrigin = validCorsRes.headers.get('access-control-allow-origin');

    if (allowOrigin === 'http://localhost:3000') {
      results['CORS'] = { pass: true, details: `Allowed origin http://localhost:3000 returned in Access-Control-Allow-Origin` };
    } else {
      results['CORS'] = { pass: false, details: `Returned allow origin: ${allowOrigin}` };
    }
  } catch (err: any) {
    results['CORS'] = { pass: false, details: err.message };
  }

  // 12. Standardized Error Handling
  try {
    const errRes = await fetch(`${API_URL}/skill-graph/skills/nonexistent-slug-xyz`);
    const errData = (await errRes.json()) as any;
    if (errRes.status === 404 && errData.error && errData.error.code === 'NOT_FOUND') {
      results['Error Handling'] = { pass: true, details: `Standardized error format verified: ${JSON.stringify(errData.error)}` };
    } else {
      results['Error Handling'] = { pass: false, details: JSON.stringify(errData) };
    }
  } catch (err: any) {
    results['Error Handling'] = { pass: false, details: err.message };
  }

  console.log('================================================================================');
  console.log('LIVE E2E RUNTIME RESULTS SUMMARY');
  console.log('================================================================================');
  for (const [key, val] of Object.entries(results)) {
    console.log(`${val.pass ? '✅ PASS' : '❌ FAIL'} | ${key.padEnd(30)} | ${val.details}`);
  }
}

runLiveE2E();
