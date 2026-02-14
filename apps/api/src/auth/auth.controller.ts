import { Controller, Post, UseGuards, Res, Body, Get, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { LoginSchema, RegisterSchema } from '@kanban/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }
    @Post('login')
    async login(@Body() raw: unknown, @Res({ passthrough: true }) response: Response) {
        // Manual Zod parsing to avoid metadata reflection issues with DTO types
        const loginDto = LoginSchema.parse(raw);
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const { access_token, user: userData } = await this.authService.login(user);
        
        // Determinar se está em produção ou desenvolvimento
        const isProduction = process.env.NODE_ENV === 'production';
        
        response.cookie('Authentication', access_token, {
            httpOnly: true,
            secure: isProduction, // Apenas HTTPS em produção
            sameSite: isProduction ? 'none' : 'lax',
            path: '/'
        });
        return { user: userData };
    }
    @Post('register')
    async register(@Body() raw: unknown) {
        const registerDto = RegisterSchema.parse(raw);
        return this.authService.register(registerDto);
    }
    @Post('logout')
    async logout(@Res({ passthrough: true }) response: Response) {
        response.clearCookie('Authentication');
        return { message: 'Logged out' };
    }
}
@Controller('')
export class AppController {
    @UseGuards(JwtAuthGuard)
    @Get('me')
    getProfile(@Req() req: any) {
        return { user: req.user };
    }
}
