import type { Usuario } from "@prisma/client";

export type ResumoUsuarioDto = {
  id: string;
  nome: string;
  nickname: string | null;
  email: string;
  perfil: Usuario["perfil"];
  status: Usuario["status"];
  instituicao: string | null;
  curso: string | null;
  semestre: string | null;
};

export type BuscarAlunosQueryDto = {
  busca?: string;
  page?: number;
  limit?: number;
};

export type BuscarUsuariosPorIdsQueryDto = {
  ids: string[];
};

export function converterParaResumoUsuario(usuario: ResumoUsuarioDto): ResumoUsuarioDto {
  return usuario;
}
