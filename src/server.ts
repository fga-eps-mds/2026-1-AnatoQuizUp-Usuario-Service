import { aplicacao } from "@/config/app";
import { conectarBancoDeDados, desconectarBancoDeDados } from "@/config/db";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

// Sobe o Usuario-Service: conecta no banco, inicia o HTTP e configura o
// encerramento gracioso (fecha servidor e desconecta o banco em SIGINT/SIGTERM).
async function iniciarServidor() {
  // Conecta no banco
  await conectarBancoDeDados();

  const servidorHttp = aplicacao.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT }, "Servidor em execucao.");
  });

  const encerrarServidor = async (signal: NodeJS.Signals) => {
    // Log do sinal recebido
    logger.info({ signal }, "Sinal de encerramento recebido.");

    // Fecha o servidor
    servidorHttp.close(async () => {
      // Desconecta do banco
      await desconectarBancoDeDados();

      logger.info("Servidor HTTP encerrado.");
      process.exit(0); // Sucesso
    });
  };

  // Encerramento Ctrl + C
  process.on("SIGINT", () => {
    void encerrarServidor("SIGINT");
  });

  // Encerramento externo
  process.on("SIGTERM", () => {
    void encerrarServidor("SIGTERM");
  });
}

// Inicializa a aplicação
void iniciarServidor().catch(async (error) => {
  logger.error({ error }, "Falha ao iniciar o servidor.");
  await desconectarBancoDeDados();
  process.exit(1); // Erro
});
