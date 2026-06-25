import type { Amizade } from "@prisma/client";

export type ResumoAmigoDto = {
  id: string;
  nome: string;
  nickname: string | null;
  curso: string | null;
  semestre: string | null;
  visivel: boolean;
};

export type ResumoAmizadeDto = Amizade & {
  amigo: ResumoAmigoDto;
};
