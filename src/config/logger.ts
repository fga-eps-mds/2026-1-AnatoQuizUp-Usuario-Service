import pino from "pino";
import pinoHttp from "pino-http";

import { env } from "@/config/env";

// Configuracao de logging do Usuario-Service com pino (logger base + logger HTTP).

// Logger base: cada log carrega servico/ambiente fixos e timestamp em ISO.
export const logger = pino({
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    servico: "anatoquizup-api",
    ambiente: env.NODE_ENV,
  },
});

// Logger de requisicoes HTTP derivado do logger base.
export const loggerHttp = pinoHttp({
  logger,
  // Severidade conforme o desfecho: 5xx/erro = error, 4xx = warn, resto = info.
  customLogLevel(_request, response, error) {
    if (error || response.statusCode >= 500) {
      return "error";
    }

    if (response.statusCode >= 400) {
      return "warn";
    }

    return "info";
  },
  // Loga so o essencial de req/res, evitando poluicao e vazamento de dados sensiveis.
  serializers: {
    req(request) {
      return {
        method: request.method,
        url: request.url,
      };
    },
    res(response) {
      return {
        statusCode: response.statusCode,
      };
    },
  },
});
