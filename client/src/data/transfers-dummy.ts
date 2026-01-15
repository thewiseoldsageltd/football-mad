export type TransferRumour = {
  id: string;
  playerName: string;
  position?: string;
  fromClub: string;
  toClub: string;
  moveType?: "Permanent" | "Loan" | "Free";
  feeText?: string;
  confidence?: number;
  tier?: "Tier A" | "Tier B" | "Tier C";
  statusLabel?: "Rumour";
  sourceLabel?: string;
  updatedAt: string;
};

export type ConfirmedTransfer = {
  id: string;
  playerName: string;
  position?: string;
  fromClub: string;
  toClub: string;
  moveType: "Permanent" | "Loan" | "Free";
  feeText?: string;
  confirmedAt: string;
  sourceType: "FPL" | "Official";
};

export type BlendedTransferItem =
  | (TransferRumour & { kind: "rumour" })
  | (ConfirmedTransfer & { kind: "confirmed" });

export const dummyRumours: TransferRumour[] = [
  {
    id: "r1",
    playerName: "Marcus Rashford",
    position: "FWD",
    fromClub: "Manchester United",
    toClub: "Barcelona",
    moveType: "Permanent",
    feeText: "£52m",
    confidence: 75,
    tier: "Tier A",
    statusLabel: "Rumour",
    sourceLabel: "The Athletic",
    updatedAt: "2026-01-14T10:30:00Z",
  },
  {
    id: "r2",
    playerName: "Dusan Vlahovic",
    position: "FWD",
    fromClub: "Juventus",
    toClub: "Arsenal",
    moveType: "Permanent",
    feeText: "£65m",
    confidence: 60,
    tier: "Tier B",
    statusLabel: "Rumour",
    sourceLabel: "Sky Sports",
    updatedAt: "2026-01-13T16:00:00Z",
  },
  {
    id: "r3",
    playerName: "Florian Wirtz",
    position: "MID",
    fromClub: "Bayer Leverkusen",
    toClub: "Liverpool",
    moveType: "Permanent",
    feeText: "£100m+",
    confidence: 40,
    tier: "Tier B",
    statusLabel: "Rumour",
    sourceLabel: "Fabrizio Romano",
    updatedAt: "2026-01-12T09:00:00Z",
  },
  {
    id: "r4",
    playerName: "Victor Osimhen",
    position: "FWD",
    fromClub: "Napoli",
    toClub: "Chelsea",
    moveType: "Permanent",
    feeText: "£85m",
    confidence: 55,
    tier: "Tier A",
    statusLabel: "Rumour",
    sourceLabel: "The Guardian",
    updatedAt: "2026-01-11T14:20:00Z",
  },
  {
    id: "r5",
    playerName: "Morten Hjulmand",
    position: "MID",
    fromClub: "Sporting CP",
    toClub: "Manchester City",
    moveType: "Permanent",
    feeText: "£60m",
    confidence: 30,
    tier: "Tier C",
    statusLabel: "Rumour",
    sourceLabel: "Daily Mail",
    updatedAt: "2026-01-10T11:00:00Z",
  },
  {
    id: "r6",
    playerName: "Mathys Tel",
    position: "FWD",
    fromClub: "Bayern Munich",
    toClub: "Tottenham",
    moveType: "Loan",
    confidence: 85,
    tier: "Tier A",
    statusLabel: "Rumour",
    sourceLabel: "Sky Germany",
    updatedAt: "2026-01-15T08:00:00Z",
  },
];

export const dummyConfirmedTransfers: ConfirmedTransfer[] = [
  {
    id: "c1",
    playerName: "Randal Kolo Muani",
    position: "FWD",
    fromClub: "Paris Saint-Germain",
    toClub: "Juventus",
    moveType: "Loan",
    confirmedAt: "2026-01-14T18:00:00Z",
    sourceType: "Official",
  },
  {
    id: "c2",
    playerName: "Rayan Cherki",
    position: "MID",
    fromClub: "Lyon",
    toClub: "Borussia Dortmund",
    moveType: "Permanent",
    feeText: "£25m",
    confirmedAt: "2026-01-13T12:00:00Z",
    sourceType: "FPL",
  },
  {
    id: "c3",
    playerName: "Dejan Kulusevski",
    position: "MID",
    fromClub: "Tottenham",
    toClub: "Juventus",
    moveType: "Permanent",
    feeText: "£32m",
    confirmedAt: "2026-01-12T15:30:00Z",
    sourceType: "Official",
  },
  {
    id: "c4",
    playerName: "Timo Werner",
    position: "FWD",
    fromClub: "RB Leipzig",
    toClub: "Tottenham",
    moveType: "Loan",
    confirmedAt: "2026-01-10T09:00:00Z",
    sourceType: "FPL",
  },
];
