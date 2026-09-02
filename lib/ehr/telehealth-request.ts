// Use the EHR's existing HttpOnly session and refresh endpoint for room requests.
export async function telehealthRequest(path: string, options: RequestInit, request: typeof fetch = fetch) {
  const requestOptions: RequestInit = { ...options, credentials: 'same-origin', cache: 'no-store' };
  let response = await request(path, requestOptions);
  if (response.status === 401) {
    const refresh = await request('/api/ehr/auth/refresh', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
    });
    if (!refresh.ok) throw new Error('Your secure EHR session has ended. Please sign in again on this portal.');
    // Retry only an authentication rejection, never a failed room operation.
    response = await request(path, requestOptions);
  }
  if (response.status === 401) throw new Error('Your secure EHR session has ended. Please sign in again on this portal.');
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The call request failed.');
  return body;
}
