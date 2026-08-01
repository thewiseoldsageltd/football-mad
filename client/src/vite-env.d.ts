/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** When "1", enables Pitch view toggle on Match Centre Starting XI. */
  readonly VITE_MATCH_CENTRE_PITCH_XI?: string;
}
