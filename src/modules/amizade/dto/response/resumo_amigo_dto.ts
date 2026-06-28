import type { Amizade } from "@prisma/client";

// Dados do amigo expostos nas respostas (resumo, sem campos sensiveis).
export type ResumoAmigoDto = {
  id: string;
  nome: string;
  nickname: string | null;
  curso: string | null;
  semestre: string | null;
  visivel: boolean;
};

// Amizade completa (campos do banco) acrescida do resumo do amigo relacionado.
export type ResumoAmizadeDto = Amizade & {
  amigo: ResumoAmigoDto;
};
