export const RANK_GAP = 1000;

export function rankInitial(): number {
    return RANK_GAP;
}

export function rankBetween(before: number | null, after: number | null): number | null {
    if (before === null && after === null) {
        return rankInitial();
    }

    if (before === null && after !== null) {
        // Insert at start
        const newRank = Math.floor(after / 2);
        return newRank > 0 ? newRank : null;
    }

    if (before !== null && after === null) {
        // Insert at end
        return before + RANK_GAP;
    }

    if (before !== null && after !== null) {
        // Insert in middle
        const diff = after - before;
        if (diff <= 1) {
            return null; // Needs reindex
        }
        return Math.floor(before + (diff / 2));
    }

    return null;
}
