// Pemanggil API dari browser: melempar ApiError berisi pesan yang bisa langsung ditampilkan.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Tidak bisa terhubung. Periksa koneksi internet lalu coba lagi.", 0, {});
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.includes("/api/auth/")) {
      window.location.href = "/masuk";
    }
    throw new ApiError((data.error as string) || `Gagal (kode ${res.status}).`, res.status, data);
  }
  return data as T;
}
