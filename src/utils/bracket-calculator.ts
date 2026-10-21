export interface BracketMatchupPlan {
  roundNumber: number;
  position: number;
  contestantAId: string | null;
  contestantBId: string | null;
  isBye: boolean;
  autoWinnerId: string | null;
}

export interface BracketGenerationPlan {
  totalContestants: number;
  powerOfTwo: number;
  totalRounds: number;
  totalByes: number;
  round1Matchups: BracketMatchupPlan[];
  subsequentRoundMatchups: BracketMatchupPlan[];
  advancements: Array<{
    contestantId: string;
    fromRound: number;
    fromPosition: number;
    toRound: number;
    toPosition: number;
    toSlot: 'A' | 'B';
  }>;
}

/**
 * Calculates the smallest power of two greater than or equal to n.
 */
export function calculateNextPowerOfTwo(n: number): number {
  if (n <= 1) return 2;
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Calculates total rounds in a single-elimination bracket for a given power of two.
 */
export function calculateTotalRounds(powerOfTwo: number): number {
  return Math.log2(powerOfTwo);
}

/**
 * Computes where a matchup winner advances in the subsequent round.
 */
export function getNextRoundPosition(
  currentRound: number,
  currentPosition: number
): { roundNumber: number; position: number; slot: 'A' | 'B' } {
  return {
    roundNumber: currentRound + 1,
    position: Math.ceil(currentPosition / 2),
    slot: currentPosition % 2 === 1 ? 'A' : 'B',
  };
}

/**
 * Generates the deterministic single-elimination bracket structure for N contestants.
 *
 * Algorithm details:
 * 1. Find next power of two P >= N.
 * 2. Total first-round matchup slots M1 = P / 2.
 * 3. Total byes B = P - N.
 * 4. Total real matches in round 1 = M1 - B = N - P / 2.
 * 5. Deterministic placement:
 *    - In round 1, we create M1 matchup positions.
 *    - Real matches get 2 contestants (Contestant A and B).
 *    - Bye matches get 1 contestant (Contestant A) and Contestant B is null.
 *    - Bye matches immediately mark Contestant A as the auto-winner.
 *    - Auto-winners advance immediately into their predetermined round 2 positions.
 * 6. Matchup slots for rounds 2..R are generated with empty contestant slots,
 *    and round 1 bye auto-winners are immediately seeded into their round 2 positions.
 */
export function generateBracketPlan(contestantIds: string[]): BracketGenerationPlan {
  const n = contestantIds.length;
  if (n < 2) {
    throw new Error('A tournament requires at least 2 contestants to generate a bracket');
  }

  const powerOfTwo = calculateNextPowerOfTwo(n);
  const totalRounds = calculateTotalRounds(powerOfTwo);
  const round1Slots = powerOfTwo / 2;
  const totalByes = powerOfTwo - n;
  const realMatchCount = round1Slots - totalByes;

  const round1Matchups: BracketMatchupPlan[] = [];
  const advancements: BracketGenerationPlan['advancements'] = [];

  let contestantIndex = 0;

  // We distribute byes deterministically:
  // First, we populate real matches (each gets 2 contestants),
  // then we populate bye matches (each gets 1 contestant).
  for (let position = 1; position <= round1Slots; position++) {
    const isBye = position > realMatchCount;

    if (!isBye) {
      const contestantAId = contestantIds[contestantIndex++];
      const contestantBId = contestantIds[contestantIndex++];
      round1Matchups.push({
        roundNumber: 1,
        position,
        contestantAId,
        contestantBId,
        isBye: false,
        autoWinnerId: null,
      });
    } else {
      const contestantAId = contestantIds[contestantIndex++];
      round1Matchups.push({
        roundNumber: 1,
        position,
        contestantAId,
        contestantBId: null,
        isBye: true,
        autoWinnerId: contestantAId,
      });

      const next = getNextRoundPosition(1, position);
      advancements.push({
        contestantId: contestantAId,
        fromRound: 1,
        fromPosition: position,
        toRound: next.roundNumber,
        toPosition: next.position,
        toSlot: next.slot,
      });
    }
  }

  // Pre-generate subsequent rounds (Round 2 up to Finals)
  const subsequentRoundMatchups: BracketMatchupPlan[] = [];
  let previousRoundSlots = round1Slots;

  for (let r = 2; r <= totalRounds; r++) {
    const currentRoundSlots = previousRoundSlots / 2;
    for (let pos = 1; pos <= currentRoundSlots; pos++) {
      // Check if any bye auto-advanced into this position
      const advanceSlotA = advancements.find(
        (a) => a.toRound === r && a.toPosition === pos && a.toSlot === 'A'
      );
      const advanceSlotB = advancements.find(
        (a) => a.toRound === r && a.toPosition === pos && a.toSlot === 'B'
      );

      subsequentRoundMatchups.push({
        roundNumber: r,
        position: pos,
        contestantAId: advanceSlotA ? advanceSlotA.contestantId : null,
        contestantBId: advanceSlotB ? advanceSlotB.contestantId : null,
        isBye: false,
        autoWinnerId: null,
      });
    }
    previousRoundSlots = currentRoundSlots;
  }

  return {
    totalContestants: n,
    powerOfTwo,
    totalRounds,
    totalByes,
    round1Matchups,
    subsequentRoundMatchups,
    advancements,
  };
}
