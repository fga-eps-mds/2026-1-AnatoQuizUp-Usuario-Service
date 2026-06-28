import type { Papel, StatusUsuario } from "@/shared/constants/papeis";

// DTOs do professor: RegistroProfessor (dominio) e RespostaProfessorDto (API), com
// o conversor que serializa as datas para string ISO.

// Professor no formato de dominio (datas como Date).
export type RegistroProfessor = {
  id: string;
  nome: string;
  email: string;
  instituicao: string | null;
  departamento: string | null;
  curso: string | null;
  siape: string | null;
  papel: Papel;
  status: StatusUsuario;
  criadoEm: Date;
  atualizadoEm: Date;
};

// Professor no formato de resposta da API (datas como string ISO).
export type RespostaProfessorDto = {
  id: string;
  nome: string;
  email: string;
  instituicao: string | null;
  departamento: string | null;
  curso: string | null;
  siape: string | null;
  papel: Papel;
  status: StatusUsuario;
  criadoEm: string;
  atualizadoEm: string;
};

// Converte o professor de dominio no DTO de resposta da API.
export function converterParaRespostaProfessor(
  professor: RegistroProfessor,
): RespostaProfessorDto {
  return {
    id: professor.id,
    nome: professor.nome,
    email: professor.email,
    instituicao: professor.instituicao,
    departamento: professor.departamento,
    curso: professor.curso,
    siape: professor.siape,
    papel: professor.papel,
    status: professor.status,
    criadoEm: professor.criadoEm.toISOString(),
    atualizadoEm: professor.atualizadoEm.toISOString(),
  };
}
