// Lightweight typed fetch helper for client components.
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: string }).error ||
      `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}
