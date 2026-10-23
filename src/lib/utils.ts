// shadcn's own clsx + tailwind-merge replacement; the generated ui components import it directly.
export { cn } from "cn";

/** Lowercase, hyphenate, strip punctuation. Same rule as GG-ops so slugs match. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() ||
    "?"
  );
}

// ponytail: tag-stripping regex, good enough for display of GG-ops editor HTML because React escapes
// the result; swap for a real parser if rich text ever needs to render as rich text here.
export function plainText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<(br|\/p|\/li|\/h\d)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
