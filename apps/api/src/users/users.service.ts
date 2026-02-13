import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findOne(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id }
        });
    }

    async create(data: Prisma.UserCreateInput) {
        const salt = await bcrypt.genSalt();
        const password_hash = await bcrypt.hash(data.password_hash, salt);

        return this.prisma.user.create({
            data: {
                ...data,
                password_hash,
            },
        });
    }
}
