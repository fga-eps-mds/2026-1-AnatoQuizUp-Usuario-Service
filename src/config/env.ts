import dotenv from "dotenv";
import { z } from "zod";

import { parseCorsOrigins } from "@/config/cors";

// Configuracao de ambiente do Usuario-Service: carrega o .env, valida tudo com Zod
// e exporta um objeto "env" tipado, alem dos segredos de JWT mais usados.
dotenv.config();

const ambienteAtual = process.env.NODE_ENV ?? "development";
const ambienteTeste = ambienteAtual === "test";
const DEFAULT_CORS_ORIGINS = ""; //http://localhost:5173,http://127.0.0.1:5173

// Helpers de schema: variaveis obrigatorias ganham um default apenas em ambiente de
// teste, evitando exigir um .env completo na suite, mas permanecendo obrigatorias fora.
const variavelObrigatoria = (nome: string) => z.string().min(1, `${nome} is required.`);
const variavelComDefaultDeTeste = (nome: string, valorPadraoTeste: string) =>
  ambienteTeste ? z.string().min(1).default(valorPadraoTeste) : variavelObrigatoria(nome);
// Variante que tambem exige formato de email valido.
const emailComDefaultDeTeste = (nome: string, valorPadraoTeste: string) =>
  ambienteTeste
    ? z.string().email(`${nome} must be a valid email.`).default(valorPadraoTeste)
    : z.string().email(`${nome} must be a valid email.`);
// Variante que tambem exige formato de URL valido.
const urlComDefaultDeTeste = (nome: string, valorPadraoTeste: string) =>
  ambienteTeste
    ? z.string().url(`${nome} must be a valid URL.`).default(valorPadraoTeste)
    : z.string().url(`${nome} must be a valid URL.`);

// Esquema com todas as variaveis de ambiente, seus tipos e valores padrao.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: variavelComDefaultDeTeste(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/postgres?schema=public",
  ),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  BREVO_API_KEY: variavelComDefaultDeTeste("BREVO_API_KEY", "test-brevo-api-key"),
  EMAIL_FROM: emailComDefaultDeTeste("EMAIL_FROM", "noreply@example.com"),
  FRONTEND_PROD_URL: urlComDefaultDeTeste("FRONTEND_PROD_URL", "https://example.com"),
  JWT_SECRET_KEY: variavelComDefaultDeTeste("JWT_SECRET_KEY", "test-secret"),
  JWT_REFRESH_SECRET_KEY: variavelComDefaultDeTeste(
    "JWT_REFRESH_SECRET_KEY",
    "test-refresh-secret",
  ),
  JWT_PASSWORD_REDEFINITION_SECRET_KEY: variavelComDefaultDeTeste(
    "JWT_PASSWORD_REDEFINITION_SECRET_KEY",
    "test-password-redefinition-secret",
  ),
  INTERNAL_TOKEN: variavelComDefaultDeTeste("INTERNAL_TOKEN", "test-internal-token"),
  // Origens liberadas no CORS chegam como string e sao transformadas em lista.
  CORS_ORIGINS: z.string().default(DEFAULT_CORS_ORIGINS).transform(parseCorsOrigins),
});

const parsedEnv = envSchema.safeParse(process.env);

// Ambiente invalido derruba o boot imediatamente, com a lista de campos problematicos.
if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(z.flattenError(parsedEnv.error).fieldErrors)}`,
  );
}

export const env = parsedEnv.data;

// Atalhos para os segredos de JWT, evitando repetir env.* pelo codigo.
export const jwtSecretKey = env.JWT_SECRET_KEY;
export const jwtRefreshSecretKey = env.JWT_REFRESH_SECRET_KEY;
export const jwtPasswordRedefinitionSecretKey = env.JWT_PASSWORD_REDEFINITION_SECRET_KEY;
