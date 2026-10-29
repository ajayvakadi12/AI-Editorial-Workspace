/**
 * API client service for communicating with the Express backend.
 */

export async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function submitResearch(sources) {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sources }),
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error?.message || 'Failed to generate research brief.');
    error.code = data.error?.code || 'RESEARCH_ERROR';
    error.sourceStatuses = data.sourceStatuses || [];
    error.details = data.error?.details;
    throw error;
  }

  return data;
}

export async function analyzeDraft(draft) {
  const res = await fetch('/api/writing/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ draft }),
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error?.message || 'Writing analysis failed.');
    error.code = data.error?.code || 'ANALYSIS_ERROR';
    throw error;
  }

  return data;
}

