import { rankBetween, rankInitial, RANK_GAP } from './rank';

describe('Rank Module', () => {
    it('should generate an initial rank of RANK_GAP', () => {
        const rank = rankInitial();
        expect(rank).toBe(RANK_GAP);
        expect(rank).toBe(1000);
    });

    it('should generate initial rank if both before and after are null', () => {
        const rank = rankBetween(null, null);
        expect(rank).toBe(RANK_GAP);
    });

    it('should insert at start (before is null)', () => {
        // after = 1000, expect 500
        const after = 1000;
        const newRank = rankBetween(null, after);
        expect(newRank).toBe(500);
    });

    it('should insert at start with small number', () => {
        // after = 2, expect 1
        const newRank = rankBetween(null, 2);
        expect(newRank).toBe(1);
    });

    it('should insert at end (after is null)', () => {
        // before = 1000, expect 2000
        const before = 1000;
        const newRank = rankBetween(before, null);
        expect(newRank).toBe(2000); // 1000 + 1000
    });

    it('should insert between two ranks', () => {
        // 1000 and 3000 -> 2000
        const newRank = rankBetween(1000, 3000);
        expect(newRank).toBe(2000);
    });

    it('should insert between two ranks (rounding down)', () => {
        // 1000 and 2001 -> diff 1001, half ~500.5 -> 500. 1000+500 = 1500
        const newRank = rankBetween(1000, 2001);
        expect(newRank).toBe(1500);
    });

    it('should return null if gap is too small', () => {
        // 1000 and 1001 -> diff 1
        const newRank = rankBetween(1000, 1001);
        expect(newRank).toBeNull();
    });

    it('should return null if gap is 0 or negative (invalid input)', () => {
        expect(rankBetween(1000, 1000)).toBeNull();
        expect(rankBetween(1001, 1000)).toBeNull();
    });
});
