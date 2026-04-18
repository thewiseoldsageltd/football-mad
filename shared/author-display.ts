/**
 * Display-only helpers for author bylines. Canonical `author_name` stays unchanged in DB/API.
 */

/** Removes a leading "By " so templates can prefix "By " without producing "By By …". */
export function stripLeadingByFromAuthorName(name: string | null | undefined): string {
  if (name == null) return "";
  return name.replace(/^\s*by\s+/i, "").trim();
}

/**
 * UI byline: shorten Press Association / PA Media wire credits to "PA" style.
 * Used on cards, article chrome, author H1 — not for JSON-LD (use raw author_name there).
 */
export function formatAuthorForUi(name: string | null | undefined): string {
  const s0 = stripLeadingByFromAuthorName(name);
  if (!s0) return "";

  let s = s0;
  s = s.replace(/\bPress Association Sport Staff\b/gi, "PA Sport Staff");
  s = s.replace(/\bPress Association Sport Reporters\b/gi, "PA Sport Reporters");
  s = s.replace(/,\s*Press Association\b/gi, ", PA");
  s = s.replace(/,\s*PA Media\b/gi, ", PA");
  s = s.replace(/\bPress Association\b/gi, "PA");
  s = s.replace(/\bPA Media\b/gi, "PA");

  return s.trim();
}
