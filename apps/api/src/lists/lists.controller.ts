import { Controller, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ListsService } from './lists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateListSchema, MoveListSchema } from '@kanban/shared';

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListsController {
    constructor(private readonly listsService: ListsService) { }

    @Post()
    create(@Req() req: any, @Body() raw: unknown) {
        const dto = CreateListSchema.parse(raw);
        return this.listsService.create(req.user.id, dto);
    }

    @Patch(':id/move')
    move(@Req() req: any, @Param('id') id: string, @Body() raw: unknown) {
        const dto = MoveListSchema.parse(raw);
        return this.listsService.move(req.user.id, id, dto);
    }

    @Patch(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() body: { title: string }) {
        return this.listsService.update(req.user.id, id, body);
    }

    @Delete(':id')
    delete(@Req() req: any, @Param('id') id: string) {
        return this.listsService.delete(req.user.id, id);
    }
}
