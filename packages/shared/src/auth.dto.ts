import { z } from 'zod';

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const AuthResponseSchema = z.object({
    user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
    }),
});
export type AuthResponseDto = z.infer<typeof AuthResponseSchema>;
