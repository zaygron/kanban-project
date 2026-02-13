import { Controller, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCardSchema, MoveCardSchema } from '@kanban/shared';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
    constructor(private readonly cardsService: CardsService) { }

    @Post()
    create(@Req() req: any, @Body() raw: unknown) {
        const dto = CreateCardSchema.parse(raw);
        return this.cardsService.create(req.user.id, dto);
    }

    @Patch(':id/move')
    move(@Req() req: any, @Param('id') id: string, @Body() raw: unknown) {
        const dto = MoveCardSchema.parse(raw);
        return this.cardsService.move(req.user.id, id, dto);
    }

    @Patch(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() body: { title?: string; description?: string }) {
        // Validation could be automated with Zod, but body is simple here.
        return this.cardsService.update(req.user.id, id, body);
    }

    @Delete(':id')
    delete(@Req() req: any, @Param('id') id: string) {
        return this.cardsService.delete(req.user.id, id);
    }
}
