import type { Papel, StatusUsuario } from "@/shared/constants/papeis";

// DTOs do aluno: RegistroAluno (dominio, com datas Date) e RespostaAlunoDto (API,
// com datas em string), alem do conversor entre eles.

// Aluno no formato de dominio, como vem do repository.
export type RegistroAluno = {
  id: string;
  nome: string;
  nickname: string | null;
  email: string;
  instituicao: string | null;
  curso: string | null;
  periodo: string | null;
  semVinculoAcademico: boolean;
  dataNascimento: Date | null;
  nacionalidade: string | null;
  cidade: string | null;
  estado: string | null;
  escolaridade: string | null;
  papel: Papel;
  status: StatusUsuario;
  createdAt: Date;
  updatedAt: Date;
};

// Aluno no formato de resposta da API (datas serializadas como string).
export type RespostaAlunoDto = {
  id: string;
  nome: string;
  nickname: string | null;
  email: string;
  instituicao: string | null;
  curso: string | null;
  periodo: string | null;
  semVinculoAcademico: boolean;
  dataNascimento: string | null;
  nacionalidade: string | null;
  cidade: string | null;
  estado: string | null;
  escolaridade: string | null;
  papel: Papel;
  status: StatusUsuario;
  createdAt: string;
  updatedAt: string;
};

// Converte o aluno de dominio em DTO de resposta (dataNascimento so a parte de data).
export function converterParaRespostaAluno(aluno: RegistroAluno): RespostaAlunoDto {
  return {
    id: aluno.id,
    nome: aluno.nome,
    nickname: aluno.nickname,
    email: aluno.email,
    instituicao: aluno.instituicao,
    curso: aluno.curso,
    periodo: aluno.periodo,
    semVinculoAcademico: aluno.semVinculoAcademico,
    dataNascimento: aluno.dataNascimento ? aluno.dataNascimento.toISOString().slice(0, 10) : null,
    nacionalidade: aluno.nacionalidade,
    cidade: aluno.cidade,
    estado: aluno.estado,
    escolaridade: aluno.escolaridade,
    papel: aluno.papel,
    status: aluno.status,
    createdAt: aluno.createdAt.toISOString(),
    updatedAt: aluno.updatedAt.toISOString(),
  };
}
