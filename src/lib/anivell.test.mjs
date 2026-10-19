import { describe, it, expect } from "bun:test";
import { aniVellDetailSchema, aniVellLatestSchema, aniVellSearchInputSchema, aniVellSearchSchema } from "./anivell.schemas.ts";
import { requestAniVell } from "./anivell.server.ts";

describe("AniVell real-data contract", () => {
  it("preserves a missing recent episode number as null", () => {
    const parsed = aniVellLatestSchema.parse({ resultados: [{ titulo: "Series", episodio: null, fuente: "anikoto", id_externo: "series" }] });
    expect(parsed.resultados[0].episodio).toBeNull();
  });
  it("requires the documented two-character search minimum", () => {
    expect(aniVellSearchInputSchema.safeParse({ q: "n" }).success).toBe(false);
    expect(aniVellSearchInputSchema.parse({ q: " na " }).q).toBe("na");
  });
  it("rejects absent episode data rather than inventing chapters", () => {
    expect(aniVellDetailSchema.safeParse({ titulo: "Naruto", fuente: "animeav1", id_externo: "naruto" }).success).toBe(false);
  });
  it("reports malformed upstream data instead of an empty success", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true }), { status: 200 });
    try {
      await expect(requestAniVell("/api/search?q=naruto", aniVellSearchSchema)).rejects.toThrow("formato documentado");
    } finally { globalThis.fetch = original; }
  });
  it("reports upstream failure without simulated results", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    try {
      await expect(requestAniVell("/api/search?q=naruto", aniVellSearchSchema)).rejects.toThrow("503");
    } finally { globalThis.fetch = original; }
  });
});