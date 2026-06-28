import { randomUUID } from "node:crypto";

import { prisma } from "@/config/db";
import type { CriarExemploDto } from "@/modules/exemplo/dto/criar.exemplo.types";
import type { ParametrosPaginacao } from "@/shared/utils/paginacao.util";

// Repository do modulo de exemplo: CRUD basico via SQL cru do Prisma.

// Registro de exemplo como retornado pelo banco.
type RegistroExemplo = {
  id: string;
  nome: string;
  descricao: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class ExemploRepository {
  // Insere um exemplo (id gerado na aplicacao) e retorna o registro criado.
  async criar(data: CriarExemploDto) {
    const id = randomUUID();

    const registros = await prisma.$queryRaw<RegistroExemplo[]>`
      INSERT INTO exemplos (id, nome, descricao, "createdAt", "updatedAt")
      VALUES (${id}, ${data.nome}, ${data.descricao ?? null}, NOW(), NOW())
      RETURNING id, nome, descricao, "createdAt", "updatedAt"
    `;

    return registros[0];
  }

  // Lista paginada + total na mesma transacao (count separado por ser SQL cru).
  async listar(paginacao: ParametrosPaginacao) {
    const consultaListagem = prisma.$queryRaw<RegistroExemplo[]>`
      SELECT id, nome, descricao, "createdAt", "updatedAt"
      FROM exemplos
      ORDER BY "createdAt" DESC
      LIMIT ${paginacao.limit}
      OFFSET ${paginacao.skip}
    `;

    const consultaTotal = prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint AS total
      FROM exemplos
    `;

    const [data, totalResultado] = await prisma.$transaction([consultaListagem, consultaTotal]);

    // COUNT volta como bigint; converte para number (default 0 quando vazio).
    return {
      data,
      total: Number(totalResultado[0]?.total ?? 0n),
    };
  }

  // Busca um exemplo por id (null quando nao existe).
  async buscarPorId(id: string) {
    const registros = await prisma.$queryRaw<RegistroExemplo[]>`
      SELECT id, nome, descricao, "createdAt", "updatedAt"
      FROM exemplos
      WHERE id = ${id}
      LIMIT 1
    `;

    return registros[0] ?? null;
  }
}
