import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { RegisterDto } from '@kanban/shared';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(email);
        if (user && (await bcrypt.compare(pass, user.password_hash))) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user: user
        };
    }

    async register(registerDto: RegisterDto) {
        // Check if user exists
        const existing = await this.usersService.findOne(registerDto.email);
        if (existing) {
            throw new UnauthorizedException('User already exists');
        }

        const user = await this.usersService.create({
            email: registerDto.email,
            name: registerDto.name,
            password_hash: registerDto.password // Service will hash it
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, ...result } = user;
        return result;
    }
}
