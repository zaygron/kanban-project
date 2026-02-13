import { z } from 'zod';

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const BoardSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    createdBy: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    version: z.number().int(),
});

export const ListSchema = z.object({
    id: z.string().uuid(),
    boardId: z.string().uuid(),
    title: z.string().min(1),
    rank: z.number().int(),
    createdAt: z.date(),
    updatedAt: z.date(),
    version: z.number().int(),
});

export const CardSchema = z.object({
    id: z.string().uuid(),
    boardId: z.string().uuid(),
    listId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.string(),
    rank: z.number().int(),
    createdAt: z.date(),
    updatedAt: z.date(),
    version: z.number().int(),
});

// DTOs for API
export const CreateBoardSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
});
export type CreateBoardDto = z.infer<typeof CreateBoardSchema>;

export const UpdateBoardSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
});
export type UpdateBoardDto = z.infer<typeof UpdateBoardSchema>;

export const CreateListSchema = z.object({
    boardId: z.string().uuid(),
    title: z.string().min(1),
    beforeListId: z.string().uuid().optional(),
    afterListId: z.string().uuid().optional(),
});
export type CreateListDto = z.infer<typeof CreateListSchema>;

export const CreateCardSchema = z.object({
    boardId: z.string().uuid(),
    listId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    beforeCardId: z.string().uuid().optional(),
    afterCardId: z.string().uuid().optional(),
    status: z.string().optional(),
});
export type CreateCardDto = z.infer<typeof CreateCardSchema>;

export const MoveListSchema = z.object({
    boardId: z.string().uuid(),
    rank: z.number().int().optional(),
    beforeListId: z.string().uuid().optional(),
    afterListId: z.string().uuid().optional(),
});
export type MoveListDto = z.infer<typeof MoveListSchema>;

export const MoveCardSchema = z.object({
    boardId: z.string().uuid(),
    listId: z.string().uuid(),
    rank: z.number().int().optional(),
    beforeCardId: z.string().uuid().optional(),
    afterCardId: z.string().uuid().optional(),
});
export type MoveCardDto = z.infer<typeof MoveCardSchema>;
