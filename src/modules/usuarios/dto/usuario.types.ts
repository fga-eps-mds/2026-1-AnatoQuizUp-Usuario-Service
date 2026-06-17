import type { Usuario } from "@prisma/client";

import { PAPEIS, type Papel } from "@/shared/constants/papeis";

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

export type UsuarioPublicoDto = {
  id: string;
  nome: string;
  papel: Papel;
};

export type BuscarAlunosQueryDto = {
  busca?: string;
  page?: number;
  limit?: number;
};

export type BuscarUsuariosPorIdsQueryDto = {
  ids: string[];
};

export type BuscarUsuarioPorIdParamsDto = {
  id: string;
};

export type AtualizarDadosPessoaisDto = {
  nome?: string;
  nickname?: string;
};

export type AlterarSenhaDto = {
  senhaAtual: string;
  novaSenha: string;
  confirmacaoNovaSenha: string;
};

export function converterParaResumoUsuario(usuario: ResumoUsuarioDto): ResumoUsuarioDto {
  return usuario;
}

export function converterPerfilParaPapel(perfil: Usuario["perfil"]): Papel {
  if (perfil === "ADMIN") {
    return PAPEIS.ADMINISTRADOR;
  }
  return perfil;
}

export function converterParaUsuarioPublico(usuario: {
  id: string;
  nome: string;
  perfil: Usuario["perfil"];
}): UsuarioPublicoDto {
  return {
    id: usuario.id,
    nome: usuario.nome,
    papel: converterPerfilParaPapel(usuario.perfil),
  };
}
