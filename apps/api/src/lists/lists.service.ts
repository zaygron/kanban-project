import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { CreateListDto, MoveListDto } from '@kanban/shared';
import { rankInitial, rankBetween, RANK_GAP } from '@kanban/shared';

@Injectable()
export class ListsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createListDto: CreateListDto) {
        const board = await this.prisma.board.findUnique({
            where: { id: createListDto.boardId },
            include: {
                lists: {
                    orderBy: { rank: 'desc' },
                    take: 1
                }
            }
        });

        if (!board) throw new NotFoundException('Board not found');

        const membership = await this.prisma.membership.findUnique({
            where: {
                board_id_user_id: { board_id: board.id, user_id: userId }
            }
        });

        if (!membership && board.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const lastList = board.lists[0];
        const newRank = lastList ? (lastList.rank + RANK_GAP) : rankInitial();

        return this.prisma.list.create({
            data: {
                title: createListDto.title,
                board_id: createListDto.boardId,
                rank: newRank,
                version: 1
            }
        });
    }

    async move(userId: string, listId: string, dto: MoveListDto) {
        const board = await this.prisma.board.findUnique({ where: { id: dto.boardId } });
        if (!board) throw new NotFoundException('Board not found');

        const membership = await this.prisma.membership.findUnique({
            where: { board_id_user_id: { board_id: dto.boardId, user_id: userId } }
        });

        if (!membership && board.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        const list = await this.prisma.list.findUnique({ where: { id: listId } });
        if (!list || list.board_id !== dto.boardId) {
            throw new BadRequestException('Invalid list');
        }

        let newRank = dto.rank;

        if (newRank === undefined) {
            // Calculate based on before/after
            const beforeList = dto.beforeListId ? await this.prisma.list.findUnique({ where: { id: dto.beforeListId } }) : null;
            const afterList = dto.afterListId ? await this.prisma.list.findUnique({ where: { id: dto.afterListId } }) : null;

            const beforeRank = beforeList ? beforeList.rank : null;
            const afterRank = afterList ? afterList.rank : null;

            const calculated = rankBetween(beforeRank, afterRank);

            if (calculated === null) {
                // Collision detected -> Reindex
                await this.reindexBoardLists(dto.boardId);

                // Fetch again to get new ranks
                const freshBefore = dto.beforeListId ? await this.prisma.list.findUnique({ where: { id: dto.beforeListId } }) : null;
                const freshAfter = dto.afterListId ? await this.prisma.list.findUnique({ where: { id: dto.afterListId } }) : null;

                const freshBeforeRank = freshBefore ? freshBefore.rank : null;
                const freshAfterRank = freshAfter ? freshAfter.rank : null;

                const retryCalc = rankBetween(freshBeforeRank, freshAfterRank);
                if (retryCalc === null) throw new InternalServerErrorException('Ranking failed even after reindex');

                newRank = retryCalc;
            } else {
                newRank = calculated;
            }
        }

        return this.prisma.list.update({
            where: { id: listId },
            data: { rank: newRank }
        });
    }

    private async reindexBoardLists(boardId: string) {
        const lists = await this.prisma.list.findMany({
            where: { board_id: boardId },
            orderBy: { rank: 'asc' }
        });

        const updates = lists.map((list, index) =>
            this.prisma.list.update({
                where: { id: list.id },
                data: { rank: (index + 1) * RANK_GAP }
            })
        );

        await this.prisma.$transaction(updates);
    }

    async update(userId: string, listId: string, data: { title: string }) {
        const list = await this.prisma.list.findUnique({ where: { id: listId } });
        if (!list) throw new NotFoundException('List not found');

        const boardId = list.board_id;
        const membership = await this.prisma.membership.findUnique({
            where: { board_id_user_id: { board_id: boardId, user_id: userId } }
        });
        const board = await this.prisma.board.findUnique({ where: { id: boardId } });

        if (!membership && board?.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return this.prisma.list.update({
            where: { id: listId },
            data
        });
    }

    async delete(userId: string, listId: string) {
        const list = await this.prisma.list.findUnique({ where: { id: listId } });
        if (!list) throw new NotFoundException('List not found');

        const boardId = list.board_id;
        const membership = await this.prisma.membership.findUnique({
            where: { board_id_user_id: { board_id: boardId, user_id: userId } }
        });
        const board = await this.prisma.board.findUnique({ where: { id: boardId } });

        if (!membership && board?.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return this.prisma.list.delete({ where: { id: listId } });
    }
}
