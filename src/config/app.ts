import cors from "cors";

import express, { Router } from "express";

import helmet from "helmet";



import { criarOpcoesCors } from "@/config/cors";

import { env } from "@/config/env";

import { loggerHttp } from "@/config/logger";

import { authRouter } from "@/modules/auth";
import { exemploRouter } from "@/modules/exemplo";
import { usuariosRouter } from "@/modules/usuarios";
import { MENSAGENS } from "@/shared/constants/mensagens";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";

import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";

import { middlewareAutenticacao } from "@/shared/middlewares/autenticacao.middleware";

import { middlewareTokenInterno } from "@/shared/middlewares/token-interno.middleware";

import { middlewareTratamentoErros } from "@/shared/middlewares/tratamento-erros.middleware";

import { adminRouter } from "@/modules/admin/admin.routes";
import { amizadeRouter } from "@/modules/amizade/amizade.routes";



// Montagem da aplicacao Express do Usuario-Service: middlewares globais, health
// check publico, roteador da API protegido por token interno e tratamento de erros.

const aplicacao = express();

// Roteador agrupador de tudo que fica sob /api/v1.
const roteadorApi = Router();



// Middlewares globais: log HTTP, headers de seguranca (helmet), CORS e parse de JSON.
aplicacao.use(loggerHttp);

aplicacao.use(helmet());

aplicacao.use(cors(criarOpcoesCors(env.CORS_ORIGINS)));

aplicacao.use(express.json());



// Health check publico (nao passa pelo token interno), usado por monitoramento.
aplicacao.get("/health", (_request, response) => {

  return response.status(200).json({

    mensagem: MENSAGENS.apiEmExecucao,

    dados: {

      status: "ok",

      timestamp: new Date().toISOString(),

    },

  });

});



// Toda chamada para /api/* precisa vir do BFF (X-Internal-Token).

aplicacao.use("/api", middlewareTokenInterno);

// Autenticacao fica antes das rotas protegidas; o proprio authRouter trata suas
// rotas publicas (login/cadastro) internamente.
roteadorApi.use("/autenticacao", authRouter);

// A partir daqui todas as rotas exigem usuario autenticado.
roteadorApi.use(middlewareAutenticacao);
roteadorApi.use("/exemplos", exemploRouter);
roteadorApi.use("/admin", adminRouter);
roteadorApi.use("/usuarios", usuariosRouter);
roteadorApi.use("/amizade", amizadeRouter);
aplicacao.use("/api/v1", roteadorApi);


// Qualquer rota nao reconhecida vira um 404 padronizado.
aplicacao.use((_request, _response, next) => {

  next(

    new ErroAplicacao({

      codigoStatus: 404,

      codigo: CodigoDeErro.NAO_ENCONTRADO,

      mensagem: MENSAGENS.rotaNaoEncontrada,

    }),

  );

});



// Tratador central de erros sempre por ultimo, para capturar tudo o que veio antes.
aplicacao.use(middlewareTratamentoErros);



export { aplicacao };

