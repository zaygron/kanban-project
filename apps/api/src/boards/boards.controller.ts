import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateBoardSchema, UpdateBoardSchema } from '@kanban/shared';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
    constructor(private readonly boardsService: BoardsService) { }

    @Post()
    create(@Req() req: any, @Body() raw: unknown) {
        const createBoardDto = CreateBoardSchema.parse(raw);
        return this.boardsService.create(req.user.id, createBoardDto);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.boardsService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.boardsService.findOne(req.user.id, id);
    }

    @Patch(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() raw: unknown) {
        const updateBoardDto = UpdateBoardSchema.parse(raw);
        return this.boardsService.update(req.user.id, id, updateBoardDto);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id') id: string) {
        return this.boardsService.remove(req.user.id, id);
    }
}
