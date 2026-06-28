import type { z } from "zod";

import type {
  schemaLogin,
  schemaLogout,
  schemaRefreshToken,
} from "@/modules/auth/sessao/sessao.schemas";
import type { Papel } from "@/shared/constants/papeis";
import type { Status } from "@/shared/constants/status";

// Tipos da sessao. Os DTOs de entrada sao derivados dos schemas Zod (fonte unica de
// verdade), e os DTOs de saida descrevem o que a API devolve ao cliente.

// DTOs de entrada inferidos diretamente dos schemas de validacao.
export type LoginDto = z.infer<typeof schemaLogin>;
export type RefreshTokenDto = z.infer<typeof schemaRefreshToken>;
export type LogoutDto = z.infer<typeof schemaLogout>;

// Dados do usuario expostos na sessao (datas em string, sem hash de senha).
export type UsuarioSessaoDto = {
  id: string;
  nome: string;
  nickname: string | null;
  email: string;
  papel: Papel;
  status: Status;
  instituicao: string | null;
  curso: string | null;
  periodo: string | null;
  semVinculoAcademico: boolean;
  dataNascimento: string | null;
  nacionalidade: string | null;
  cidade: string | null;
  estado: string | null;
  escolaridade: string | null;
  departamento: string | null;
  siape: string | null;
  aprovadoPorId: string | null;
  aprovadoEm: string | null;
  createdAt: string;
  updatedAt: string;
  visivel: boolean;
};

// Par de tokens devolvido no login.
export type RespostaLoginDto = {
  accessToken: string;
  refreshToken: string;
};

// Renovacao devolve o mesmo formato do login.
export type RespostaRenovarSessaoDto = RespostaLoginDto;

export type RespostaUsuarioAutenticadoDto = {
  usuario: UsuarioSessaoDto;
};
