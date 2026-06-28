import type { CorsOptions } from "cors";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";

// Converte a string de origens do .env em lista limpa (sem espacos nem vazios).
export function parseCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Monta as opcoes do CORS: libera requisicoes sem origin ou de origens na lista;
// as demais sao rejeitadas com 403.
export function criarOpcoesCors(origensPermitidas: string[]): CorsOptions {
  return {
    origin(origin, callback) {
      // Sem origin (server-to-server/health) ou origin autorizada: permite.
      if (!origin || origensPermitidas.includes(origin)) {
        callback(null, true);
        return;
      }

      // Origin nao autorizada vira erro 403 tratado pelo middleware central.
      callback(
        new ErroAplicacao({
          codigoStatus: 403,
          codigo: CodigoDeErro.PROIBIDO,
          mensagem: MENSAGENS.origemCorsNaoPermitida,
          detalhes: {
            origin,
          },
        }),
      );
    },
  };
}