/**
 * API client service for communicating with the Express backend.
 */


const API_URL = import.meta.env.VITE_API_URL;

async function parseResponse(res) {
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Expected JSON but received a non-JSON response (HTTP ${res.status}). ` +
      text.slice(0, 150)
    );
  }

  if (!res.ok) {
    const error = new Error(
      data.error?.message || `Request failed with status ${res.status}`
    );
    error.code = data.error?.code || 'API_ERROR';
    error.sourceStatuses = data.sourceStatuses || [];
    error.details = data.error?.details;
    throw error;
  }

  return data;
}

export async function fetchHealth() {
  const res = await fetch(`${API_URL}/api/health`);
  return parseResponse(res);
}

export async function submitResearch(sources) {
  const res = await fetch(`${API_URL}/api/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sources }),
  });

  return parseResponse(res);
}

export async function analyzeDraft(draft) {
  const res = await fetch(`${API_URL}/api/writing/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ draft }),
  });

  return parseResponse(res);
}


