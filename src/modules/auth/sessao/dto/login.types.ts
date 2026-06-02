import type { z } from "zod";

import type {
  schemaLogin,
  schemaLogout,
  schemaRefreshToken,
} from "@/modules/auth/sessao/sessao.schemas";
import type { Papel } from "@/shared/constants/papeis";
import type { Status } from "@/shared/constants/status";

export type LoginDto = z.infer<typeof schemaLogin>;
export type RefreshTokenDto = z.infer<typeof schemaRefreshToken>;
export type LogoutDto = z.infer<typeof schemaLogout>;

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

export type RespostaLoginDto = {
  accessToken: string;
  refreshToken: string;
};

export type RespostaRenovarSessaoDto = RespostaLoginDto;

export type RespostaUsuarioAutenticadoDto = {
  usuario: UsuarioSessaoDto;
};
