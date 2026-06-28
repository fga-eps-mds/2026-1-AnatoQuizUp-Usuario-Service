import type { Usuario } from "@prisma/client";

import { PAPEIS, type Papel } from "@/shared/constants/papeis";

// DTOs e conversores do modulo de usuarios: formatos de resposta e tipos de query.

// Resumo do usuario retornado nas listagens (sem dados sensiveis).
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

// Projecao publica minima de um usuario (id, nome e papel ja traduzido).
export type UsuarioPublicoDto = {
  id: string;
  nome: string;
  papel: Papel;
};

// Aluno elegivel ao ranking (dados basicos, ja filtrado por visibilidade).
export type AlunoVisivelDto = {
  id: string;
  nome: string;
  nickname: string | null;
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

export type BuscarUsuarioPorIdParamsDto = {
  id: string;
};

// Identidade de resumo (no-op tipado para padronizar o ponto de conversao).
export function converterParaResumoUsuario(usuario: ResumoUsuarioDto): ResumoUsuarioDto {
  return usuario;
}

// Traduz o perfil do banco ("ADMIN") para o papel de dominio (ADMINISTRADOR).
export function converterPerfilParaPapel(perfil: Usuario["perfil"]): Papel {
  if (perfil === "ADMIN") {
    return PAPEIS.ADMINISTRADOR;
  }
  return perfil;
}

// Monta a projecao publica de um usuario a partir do registro do banco.
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
