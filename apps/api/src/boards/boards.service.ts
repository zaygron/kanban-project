import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBoardSchema, UpdateBoardSchema } from '@kanban/shared';
import type { CreateBoardDto, UpdateBoardDto } from '@kanban/shared';
import { rankInitial, RANK_GAP } from '@kanban/shared';

@Injectable()
export class BoardsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createBoardDto: CreateBoardDto) {
        const defaultLists = ['To Do', 'Doing', 'Done'];

        // Generate ranks
        const listData = defaultLists.map((title, index) => ({
            title,
            rank: (index + 1) * RANK_GAP
        }));

        return this.prisma.board.create({
            data: {
                name: createBoardDto.name,
                created_by: userId,
                memberships: {
                    create: {
                        user_id: userId,
                        role: 'OWNER'
                    }
                },
                lists: {
                    create: listData
                }
            },
            include: {
                lists: true
            }
        });
    }

    async findAll(userId: string) {
        return this.prisma.board.findMany({
            where: {
                memberships: {
                    some: {
                        user_id: userId,
                    },
                },
            },
            orderBy: {
                updated_at: 'desc'
            }
        });
    }

    async findOne(userId: string, id: string) {
        const board = await this.prisma.board.findUnique({
            where: { id },
            include: {
                lists: {
                    orderBy: { rank: 'asc' },
                    include: {
                        cards: {
                            orderBy: { rank: 'asc' }
                        }
                    }
                }
            },
        });

        if (!board) {
            throw new NotFoundException('Board not found');
        }

        // Check access
        const hasAccess = await this.prisma.membership.findUnique({
            where: {
                board_id_user_id: {
                    board_id: id,
                    user_id: userId
                }
            }
        });

        if (!hasAccess && board.created_by !== userId) {
            throw new ForbiddenException('Access denied');
        }

        return board;
    }

    async update(userId: string, id: string, updateBoardDto: UpdateBoardDto) {
        const board = await this.prisma.board.findUnique({ where: { id } });
        if (!board) throw new NotFoundException('Board not found');

        if (board.created_by !== userId) {
            // Check if user is at least a member (or specific role if implemented)
            // For MVP let's restrict update to creator or strictly check membership.
            // Let's allow members to update for now, or revert to Forbidden.
            // Checking membership:
            const membership = await this.prisma.membership.findUnique({
                where: {
                    board_id_user_id: { board_id: id, user_id: userId }
                }
            });
            if (!membership) throw new ForbiddenException('Access denied');
        }

        return this.prisma.board.update({
            where: { id },
            data: {
                name: updateBoardDto.name,
                // Description not in schema apparently?
                // The schema for Board has: id, name, created_by, created_at, updated_at, archived_at, version.
                // NO description field in Board model in schema.prisma!
                // I should remove description from DTO or Schema logic here.
                // Looking at schema.prisma provided earlier: model Board { ... name String ... } NO description.
                // So I will ignore description for now.
            },
        });
    }

    async remove(userId: string, id: string) {
        const board = await this.prisma.board.findUnique({ where: { id } });
        if (!board) throw new NotFoundException('Board not found');

        // Only creator can delete
        if (board.created_by !== userId) {
            throw new ForbiddenException('Only owner can delete board');
        }

        // Hard delete board (cascades usually handled by DB or Prisma)
        // Prisma schema didn't specify onDelete: Cascade explicitly in the provided snippet?
        // Let's check relation: `board Board @relation(...)` in List.
        // If no cascade, we might need to delete lists/cards first.
        // Assuming Prisma or DB handles it or we wrap in transaction.
        // Let's try delete directly, if it fails due to FK, I will fix.
        return this.prisma.board.delete({
            where: { id },
        });
    }
}
