import { z } from "zod";

// Schemas Zod da sessao (login, refresh e logout).

// Login: email normalizado/validado + senha nao vazia.
export const schemaLogin = z.object({
  email: z
    .string()
    .trim()
    .max(255)
    .pipe(z.email())
    .transform((email) => email.toLowerCase()),
  senha: z.string().min(1),
});

// Refresh: exige o refresh token nao vazio.
export const schemaRefreshToken = z.object({
  refreshToken: z.string().trim().min(1),
});

// Logout usa o mesmo formato do refresh (precisa do token para revogar).
export const schemaLogout = schemaRefreshToken;
