// Title normalization used for de-duplication across sources and languages.
export function normalizeTitle(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-_:;,.!?'"`’“”()[\]{}~・：／/\\|]+/g, "")
    .replace(/(season|seasonpart|temporada|cour)$/g, "")
    .trim();
}

export function buildSearchKeys(titles: Array<string | null | undefined>): string[] {
  const keys = new Set<string>();
  for (const t of titles) {
    const k = normalizeTitle(t);
    if (k.length >= 2) keys.add(k);
  }
  return [...keys];
}
