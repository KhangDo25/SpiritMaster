export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true && data.data?.status === 'UP';
  } catch (error) {
    console.error('Health check failed', error);
    return false;
  }
}
