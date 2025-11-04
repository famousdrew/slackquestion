/**
 * Expertise Matching Service
 * Matches questions to users based on their expertise
 */

export interface ExpertiseMatch {
  userId: string;
  score: number;
  reasons: string[];
}

// Placeholder - will implement in Phase 3
export async function findBestResponders(
  questionKeywords: string[],
  channelId: string,
  limit: number = 3
): Promise<ExpertiseMatch[]> {
  // TODO: Implement expertise matching algorithm
  return [];
}
