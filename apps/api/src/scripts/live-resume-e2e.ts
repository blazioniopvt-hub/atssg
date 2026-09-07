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

async function runResumeE2E() {
  console.log('🚀 STARTING CRITICAL RESUME E2E VALIDATION SUITE\n');
  const results: Record<string, { pass: boolean; details: string }> = {};

  const timestamp = Date.now();
  const email = `resume_user_${timestamp}@skillsync.local`;
  const password = 'TestPassword123!';
  let cookie = '';

  // 1. User Registration
  try {
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username: `resume_user_${timestamp}`, password, displayName: 'Resume E2E User' }),
    });
    cookie = extractCookie(regRes);
    const data = (await regRes.json()) as any;
    if (regRes.status === 201 && data.user && cookie) {
      results['User Authentication'] = { pass: true, details: `Registered & acquired session cookie for ${email}` };
    } else {
      results['User Authentication'] = { pass: false, details: JSON.stringify(data) };
    }
  } catch (err: any) {
    results['User Authentication'] = { pass: false, details: err.message };
  }

  // 2. Resume File Upload (Multipart Form Data)
  let resumeId = '';
  const sampleResumeContent = `
John Doe - Senior Full-Stack Engineer
Email: john.doe@example.com | Phone: 555-0199 | San Francisco, CA

SUMMARY
Experienced Full-Stack Engineer specializing in TypeScript, React, Node.js, Next.js, PostgreSQL, AWS, and Docker.

WORK EXPERIENCE
Senior Software Engineer - TechCorp Inc. (2021 - Present)
- Architected and built scalable microservices using TypeScript, Hono, Node.js, and Supabase PostgreSQL.
- Implemented real-time AI skill extraction pipeline and graph intelligence features.

Software Engineer - DevStudio (2018 - 2021)
- Developed responsive web applications using React, TailwindCSS, and Next.js.

EDUCATION
Bachelor of Science in Computer Science - University of California (2014 - 2018)

SKILLS
TypeScript, React, Node.js, PostgreSQL, AWS, GraphQL, Docker, TailwindCSS, Next.js, Python
`;

  try {
    const blob = new Blob([sampleResumeContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'john_doe_resume.txt');

    const uploadRes = await fetch(`${API_URL}/resumes/upload`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: formData,
    });
    const uploadData = (await uploadRes.json()) as any;

    if (uploadRes.status === 201 && uploadData.data?.resumeId) {
      resumeId = uploadData.data.resumeId;
      results['Resume Upload'] = { pass: true, details: `Uploaded resume TXT file, created resume ID: ${resumeId}` };
    } else {
      results['Resume Upload'] = { pass: false, details: JSON.stringify(uploadData) };
    }
  } catch (err: any) {
    results['Resume Upload'] = { pass: false, details: err.message };
  }

  // 3. Resume List & File Metadata Verification
  try {
    const listRes = await fetch(`${API_URL}/resumes`, {
      headers: { Cookie: cookie },
    });
    const listData = (await listRes.json()) as any;
    const found = listData.data?.resumes?.find((r: any) => r.id === resumeId);
    if (listRes.status === 200 && found && found.originalFilename === 'john_doe_resume.txt' && found.status === 'READY') {
      results['Resume List & Metadata'] = { pass: true, details: `Found uploaded file '${found.originalFilename}', status: READY, size: ${found.fileSize}B` };
    } else {
      results['Resume List & Metadata'] = { pass: false, details: JSON.stringify(listData) };
    }
  } catch (err: any) {
    results['Resume List & Metadata'] = { pass: false, details: err.message };
  }

  // 4. Resume AI Analysis Execution
  let extractedSkills: string[] = [];
  try {
    const analyzeRes = await fetch(`${API_URL}/resumes/${resumeId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ resumeId }),
    });
    const analyzeData = (await analyzeRes.json()) as any;

    const parsed = analyzeData.data?.parsedContent || analyzeData.data || {};
    const skills = parsed.skills || [];
    const experiences = parsed.experiences || [];
    const education = parsed.education || [];

    if (analyzeRes.status === 200 && skills.length > 0) {
      extractedSkills = skills.map((s: any) => (typeof s === 'string' ? s : s.name || s.originalName)).filter(Boolean);
      results['Resume AI Analysis'] = { pass: true, details: `Analysis succeeded: ${extractedSkills.length} skills extracted (${extractedSkills.slice(0, 5).join(', ')}...), ${experiences.length} experiences, ${education.length} education entries` };
    } else {
      results['Resume AI Analysis'] = { pass: false, details: JSON.stringify(analyzeData) };
    }
  } catch (err: any) {
    results['Resume AI Analysis'] = { pass: false, details: err.message };
  }

  // 5. Resume Confirmation & Persistence into Profile
  try {
    const selectedSkillsToAccept = extractedSkills.slice(0, 3);
    const confirmRes = await fetch(`${API_URL}/resumes/${resumeId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ acceptedSkills: selectedSkillsToAccept, acceptedExperiences: ['Senior Software Engineer'] }),
    });
    const confirmData = (await confirmRes.json()) as any;

    if (confirmRes.status === 200 && confirmData.data) {
      results['Resume Confirmation'] = { pass: true, details: `Confirmed selected skills: ${selectedSkillsToAccept.join(', ')}. Added skills count: ${confirmData.data.addedSkillsCount}` };
    } else {
      results['Resume Confirmation'] = { pass: false, details: JSON.stringify(confirmData) };
    }
  } catch (err: any) {
    results['Resume Confirmation'] = { pass: false, details: err.message };
  }

  // 6. Persistence Verification in User Profile Skills
  try {
    const profileSkillsRes = await fetch(`${API_URL}/skill-intelligence/skills`, {
      headers: { Cookie: cookie },
    });
    const profileSkillsData = (await profileSkillsRes.json()) as any;
    const addedUserSkills = profileSkillsData.data || [];
    if (profileSkillsRes.status === 200 && addedUserSkills.length > 0) {
      results['Profile Skill Persistence'] = { pass: true, details: `User profile now reflects ${addedUserSkills.length} skills persisted from confirmed resume!` };
    } else {
      results['Profile Skill Persistence'] = { pass: false, details: JSON.stringify(profileSkillsData) };
    }
  } catch (err: any) {
    results['Profile Skill Persistence'] = { pass: false, details: err.message };
  }

  // 7. Edge Cases & Validation Testing
  // 7a. Unsupported File Type
  try {
    const badBlob = new Blob(['PNG binary data'], { type: 'image/png' });
    const badFormData = new FormData();
    badFormData.append('file', badBlob, 'image.png');

    const badUploadRes = await fetch(`${API_URL}/resumes/upload`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: badFormData,
    });
    const badData = (await badUploadRes.json()) as any;
    if (badUploadRes.status === 400 && badData.error) {
      results['Unsupported File Rejection'] = { pass: true, details: `Rejected unsupported image/png file with HTTP 400: ${badData.error.message}` };
    } else {
      results['Unsupported File Rejection'] = { pass: false, details: `Status: ${badUploadRes.status}, body: ${JSON.stringify(badData)}` };
    }
  } catch (err: any) {
    results['Unsupported File Rejection'] = { pass: false, details: err.message };
  }

  // 7b. Expired / Invalid Session
  try {
    const unauthRes = await fetch(`${API_URL}/resumes`, {
      headers: { Cookie: 'skillsync_session=invalid_jwt_token_12345' },
    });
    if (unauthRes.status === 401) {
      results['Session Security Protection'] = { pass: true, details: `Protected endpoint rejected invalid session token with HTTP 401 Unauthorized` };
    } else {
      results['Session Security Protection'] = { pass: false, details: `Status: ${unauthRes.status}` };
    }
  } catch (err: any) {
    results['Session Security Protection'] = { pass: false, details: err.message };
  }

  console.log('================================================================================');
  console.log('CRITICAL RESUME E2E RESULTS SUMMARY');
  console.log('================================================================================');
  for (const [key, val] of Object.entries(results)) {
    console.log(`${val.pass ? '✅ PASS' : '❌ FAIL'} | ${key.padEnd(30)} | ${val.details}`);
  }
}

runResumeE2E();
