import { z } from "zod";

/** Fixed upstream; callers cannot supply an arbitrary URL. No scraping or persistence. */
export async function requestAniVell<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`https://anivellapi.lovable.app${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new Error("AniVell no respondió a tiempo. Inténtalo nuevamente.");
  }
  if (!response.ok) {
    throw new Error(`AniVell respondió con un error (${response.status}). Inténtalo nuevamente.`);
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new Error("AniVell no devolvió una respuesta JSON válida."); }
  if (typeof payload === "object" && payload !== null && "success" in payload && payload.success === false) {
    throw new Error("AniVell no pudo obtener los datos de esta fuente.");
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("La respuesta de AniVell no coincide con su formato documentado.");
  }
  return parsed.data;
}