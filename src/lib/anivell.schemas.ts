import { z } from "zod";

const optionalText = z.string().nullish();
export const aniVellSeriesSchema = z.object({
  titulo: z.string(),
  titulo_es: optionalText,
  portada: optionalText,
  sinopsis_es: optionalText,
  anio: z.number().nullish(),
  estado: optionalText,
  total_capitulos: z.number().nullish(),
  generos: z.array(z.string()).nullish(),
  tipo: optionalText,
  sub_espanol: z.boolean().nullish(),
  fuentes: z.array(z.string()),
  ids_por_fuente: z.record(z.string()),
});
export const aniVellSearchSchema = z.object({
  resultados: z.array(aniVellSeriesSchema),
  fuentes: z.record(z.string()).optional(),
});
export const aniVellDetailSchema = aniVellSeriesSchema.omit({ fuentes: true, ids_por_fuente: true }).extend({
  fuente: z.string(),
  id_externo: z.string(),
  episodios: z.array(z.object({
    numero: z.number(),
    disponible: z.boolean().nullish(),
    sub_espanol: z.boolean().nullish(),
    slug: optionalText,
    titulo: optionalText,
  })),
});
export const aniVellServersSchema = z.object({
  servidores: z.array(z.object({ nombre: z.string(), tipo: z.string(), url: z.string().url(), sub_espanol: z.boolean().nullish() })),
  recomendado: optionalText,
  fuentes_caidas: z.array(z.string()).optional(),
});
export const aniVellLatestSchema = z.object({
  resultados: z.array(z.object({
    titulo: z.string(), titulo_es: optionalText, portada: optionalText,
    episodio: z.number(), fuente: z.string(), id_externo: z.string(),
    slug: optionalText, sub_espanol: z.boolean().nullish(),
  })),
});

export const aniVellIdentitySchema = z.object({ fuente: z.string().trim().min(1).max(100), id: z.string().trim().min(1).max(300) });
export const aniVellSearchInputSchema = z.object({ q: z.string().trim().min(2).max(200) });
export const aniVellEpisodeInputSchema = aniVellIdentitySchema.extend({ n: z.number().positive().finite() });
export type AniVellSeries = z.infer<typeof aniVellSeriesSchema>;