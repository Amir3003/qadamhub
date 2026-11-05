export type PublicFormResult = 'stored' | 'limited' | 'error';

export async function submitPublicForm(kind: 'pilot' | 'suggestion', data: object): Promise<PublicFormResult> {
  try {
    const response = await fetch('/api/public-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, data }),
    });
    if (response.status === 429) return 'limited';
    return response.ok ? 'stored' : 'error';
  } catch {
    return 'error';
  }
}
