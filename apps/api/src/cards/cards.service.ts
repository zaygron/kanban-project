import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { CreateCardDto, MoveCardDto } from '@kanban/shared';
import { rankInitial, rankBetween, RANK_GAP } from '@kanban/shared';

@Injectable()
export class CardsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createCardDto: CreateCardDto) {
        const list = await this.prisma.list.findUnique({
            where: { id: createCardDto.listId },
            include: {
                cards: {
                    orderBy: { rank: 'desc' },
                    take: 1
                }
            }
        });

        if (!list) throw new NotFoundException('List not found');
        if (list.board_id !== createCardDto.boardId) throw new ForbiddenException('Board mismatch');

        const membership = await this.prisma.membership.findUnique({
            where: { board_id_user_id: { board_id: createCardDto.boardId, user_id: userId } }
        });

        const board = await this.prisma.board.findUnique({ where: { id: createCardDto.boardId } });
        if (!membership && board?.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const lastCard = list.cards[0];
        const newRank = lastCard ? (lastCard.rank + RANK_GAP) : rankInitial();

        return this.prisma.card.create({
            data: {
                title: createCardDto.title,
                description: createCardDto.description || '',
                status: 'active',
                rank: newRank,
                board_id: createCardDto.boardId,
                list_id: createCardDto.listId,
                created_by: userId,
                version: 1
            }
        });
    }

    async move(userId: string, cardId: string, dto: MoveCardDto) {
        const card = await this.prisma.card.findUnique({ where: { id: cardId } });
        if (!card) throw new NotFoundException('Card not found');

        const board = await this.prisma.board.findUnique({ where: { id: dto.boardId } });
        if (!board) throw new NotFoundException('Board not found');

        const membership = await this.prisma.membership.findUnique({
            where: { board_id_user_id: { board_id: dto.boardId, user_id: userId } }
        });

        if (!membership && board.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const list = await this.prisma.list.findUnique({ where: { id: dto.listId } });
        if (!list || list.board_id !== dto.boardId) {
            throw new BadRequestException('Invalid list');
        }

        let newRank = dto.rank;

        if (newRank === undefined) {
            // Calculate based on before/after
            const beforeCard = dto.beforeCardId ? await this.prisma.card.findUnique({ where: { id: dto.beforeCardId } }) : null;
            const afterCard = dto.afterCardId ? await this.prisma.card.findUnique({ where: { id: dto.afterCardId } }) : null;

            const beforeRank = beforeCard ? beforeCard.rank : null;
            const afterRank = afterCard ? afterCard.rank : null;

            const calculated = rankBetween(beforeRank, afterRank);

            if (calculated === null) {
                // Collision detected -> Reindex
                await this.reindexListCards(dto.listId);

                // Fetch again
                const freshBefore = dto.beforeCardId ? await this.prisma.card.findUnique({ where: { id: dto.beforeCardId } }) : null;
                const freshAfter = dto.afterCardId ? await this.prisma.card.findUnique({ where: { id: dto.afterCardId } }) : null;

                const freshBeforeRank = freshBefore ? freshBefore.rank : null;
                const freshAfterRank = freshAfter ? freshAfter.rank : null;

                const retryCalc = rankBetween(freshBeforeRank, freshAfterRank);
                if (retryCalc === null) throw new InternalServerErrorException('Ranking failed even after reindex');

                newRank = retryCalc;
            } else {
                newRank = calculated;
            }
        }

        return this.prisma.card.update({
            where: { id: cardId },
            data: {
                list_id: dto.listId,
                rank: newRank
            }
        });
    }

    private async reindexListCards(listId: string) {
        const cards = await this.prisma.card.findMany({
            where: { list_id: listId },
            orderBy: { rank: 'asc' }
        });

        const updates = cards.map((card, index) =>
            this.prisma.card.update({
                where: { id: card.id },
                data: { rank: (index + 1) * RANK_GAP }
            })
        );

        await this.prisma.$transaction(updates);
    }

    async update(userId: string, cardId: string, data: { title?: string; description?: string }) {
        const card = await this.prisma.card.findUnique({ where: { id: cardId } });
        if (!card) throw new NotFoundException('Card not found');

        const boardId = card.board_id;
        const membership = await this.prisma.membership.findUnique({
            where: { board_id_user_id: { board_id: boardId, user_id: userId } }
        });
        const board = await this.prisma.board.findUnique({ where: { id: boardId } });

        if (!membership && board?.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return this.prisma.card.update({
            where: { id: cardId },
            data
        });
    }

    async delete(userId: string, cardId: string) {
        const card = await this.prisma.card.findUnique({ where: { id: cardId } });
        if (!card) throw new NotFoundException('Card not found');

        const boardId = card.board_id;
        const membership = await this.prisma.membership.findUnique({
            where: { board_id_user_id: { board_id: boardId, user_id: userId } }
        });
        const board = await this.prisma.board.findUnique({ where: { id: boardId } });

        if (!membership && board?.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return this.prisma.card.delete({ where: { id: cardId } });
    }
}
