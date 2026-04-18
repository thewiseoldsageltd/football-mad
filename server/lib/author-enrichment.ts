import { isPaSportDeskAuthor } from "@shared/author-enrichment";

/**
 * Optional curated author profile fields (keyed by canonical author URL slug).
 * Omit keys you do not want set — do not use null placeholders.
 */
export type CuratedAuthorFields = {
  headshotUrl?: string;
  linkedInUrl?: string;
  xUrl?: string;
  websiteUrl?: string;
  /** Editorial primary beat / coverage focus; overrides tag inference when set. */
  primaryBeat?: string;
  bio?: string;
};

const CURATED_AUTHOR_ENRICHMENT: Record<string, CuratedAuthorFields> = {
  "simon-peach": {
    xUrl: "https://x.com/SimonPeach",
    linkedInUrl: "https://www.linkedin.com/in/simonpeach/",
    primaryBeat: "Manchester United & England",
    bio: "Simon Peach is one of the UK’s leading football journalists, covering Manchester United, England and major tournaments for PA Media.",
  },
  "rory-dollard": {
    xUrl: "https://x.com/thervd",
    bio: "Rory Dollard is a PA Media journalist who has reported across major international sporting events, including football tournaments and England coverage.",
  },
  "damian-spellman": {
    xUrl: "https://x.com/DamianSpellman",
    primaryBeat: "Newcastle United",
    bio: "Damian Spellman is a north-east sports reporter for PA Media with long-standing experience covering Newcastle United and football across the region.",
  },
  "jonathan-veal": {
    xUrl: "https://x.com/jonathandveal83",
    linkedInUrl: "https://www.linkedin.com/in/jonathan-veal-b2316639/",
    primaryBeat: "Football News",
    bio: "Jonathan Veal is a PA Media sports reporter covering football and major sporting events in the UK and abroad.",
  },
  "george-sessions": {
    xUrl: "https://x.com/GeorgeSessions",
    linkedInUrl: "https://www.linkedin.com/in/george-sessions-200a45188/",
    primaryBeat: "Tottenham Hotspur",
    bio: "George Sessions is a PA Media sports reporter whose work includes Tottenham Hotspur, London clubs and wider football coverage.",
  },
  "jamie-gardner": {
    xUrl: "https://x.com/PAJamieGardner?lang=en",
    linkedInUrl: "https://www.linkedin.com/in/jamie-gardner-0487b453/",
    primaryBeat: "Football Finance",
    bio: "Jamie Gardner is PA Media’s Chief Sports Reporter, covering off-field issues in football including governance, finance and the business of sport.",
  },
  "andy-hampson": {
    xUrl: "https://x.com/andyhampson",
    linkedInUrl: "https://www.linkedin.com/in/andy-hampson-a9856a49/",
    primaryBeat: "Manchester City",
    bio: "Andy Hampson is a north-west based sports journalist for PA Media, best known for covering Manchester City and football across the region.",
  },
  "ian-parker": {
    xUrl: "https://x.com/iparkysport",
    linkedInUrl: "https://www.linkedin.com/in/ian-parker-966a3943/",
    primaryBeat: "North West Football",
    bio: "Ian Parker is a PA Media sports reporter based in Manchester, covering football in the north west as well as major international events.",
  },
  "phil-blanche": {
    xUrl: "https://x.com/philblanche",
    primaryBeat: "Wales",
    bio: "Phil Blanche is a PA Media sports reporter specialising in Welsh football and the national teams.",
  },
  "ronnie-esplin": {
    xUrl: "https://x.com/RonnieEsplin",
    linkedInUrl: "https://www.linkedin.com/in/ronnie-esplin-94613487/",
    primaryBeat: "Scottish Football & Scotland National Team",
    bio: "Ronnie Esplin is a Glasgow-based PA Media sports reporter covering Scottish football and the Scotland national team, with extensive matchday and tournament experience.",
  },
  "gavin-mccafferty": {
    xUrl: "https://x.com/GavinMcCafferty",
    primaryBeat: "Scottish Football",
    bio: "Gavin McCafferty is PA Media’s Scottish sports editor, covering Scottish football and the biggest stories north of the border.",
  },
  "david-charlesworth": {
    xUrl: "https://x.com/charlie_4444",
    linkedInUrl: "https://www.linkedin.com/in/david-charlesworth-27172850/",
    bio: "David Charlesworth is a PA Media sports journalist with experience covering major events across multiple sports, including football.",
  },
  "eleanor-crooks": {
    xUrl: "https://x.com/EleanorcrooksPA",
    linkedInUrl: "https://www.linkedin.com/in/eleanor-crooks-35401a97/",
    primaryBeat: "England & Major Tournaments",
    bio: "Eleanor Crooks is a PA Media journalist who has reported from major tournaments and also covers football in the north west.",
  },
  "pa-sport-staff": {
    xUrl: "https://x.com/PADugout",
    linkedInUrl: "https://www.linkedin.com/company/-pa-media/",
    primaryBeat: "UK Football",
    bio: "PA Sport Staff is the syndicated football news desk of PA Media, supplying match reports, breaking news and football coverage across the UK game.",
  },
  "pa-sport-reporters": {
    xUrl: "https://x.com/PADugout",
    linkedInUrl: "https://www.linkedin.com/company/-pa-media/",
    primaryBeat: "UK Football",
    bio: "PA Sport Reporters is a shared PA Media byline used for syndicated football reporting, previews, match coverage and breaking news.",
  },
};

export type AuthorPageEnrichment = CuratedAuthorFields & {
  showPaDeskAvatar?: boolean;
};

export function buildAuthorPageEnrichment(slug: string, displayName: string): AuthorPageEnrichment {
  const curated = CURATED_AUTHOR_ENRICHMENT[slug] ?? {};
  if (isPaSportDeskAuthor(displayName)) {
    return { showPaDeskAvatar: true, ...curated };
  }
  return { ...curated };
}
