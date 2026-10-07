/**
 * How a helper's name is shortened for a greeting. Households often save a
 * title with the name ("Kuya Marito", "Ate Marites"), and taking the first
 * word greeted Marito as "Kuya". The same rule as the manager's dashboard
 * (../LINARA/src/features/people/people.utils.ts, shortNameOf): drop a
 * leading title, then use the first name; a "Ma. Theresa" goes by Theresa.
 */
const TITLES = new Set([
  "ate",
  "kuya",
  "manang",
  "manong",
  "nanay",
  "tatay",
  "lola",
  "lolo",
  "tita",
  "tito",
  "ninang",
  "ninong",
  "yaya",
  "aling",
  "mang",
  "ms",
  "mr",
  "mrs",
  "miss",
  "sir",
  "maam",
  "ma'am",
]);

/** "Kuya Marito" -> "Marito", "Nicole Azachee" -> "Nicole". A title alone is kept. */
export function firstNameOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const lead = parts[0]?.toLowerCase().replace(/\.$/, "");
  const given = parts.length > 1 && lead && TITLES.has(lead) ? parts.slice(1) : parts;
  return (/^ma\.$/i.test(given[0] ?? "") ? given[1] : given[0]) ?? name.trim();
}
