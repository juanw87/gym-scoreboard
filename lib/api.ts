const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    let message = "Unexpected API error.";

    try {
      const errorBody = (await response.json()) as { error?: string };
      message = errorBody.error ?? message;
    } catch {
      message = "Unexpected API error.";
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}
