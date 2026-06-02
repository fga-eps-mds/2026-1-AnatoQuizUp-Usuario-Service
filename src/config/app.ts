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



const aplicacao = express();

const roteadorApi = Router();



aplicacao.use(loggerHttp);

aplicacao.use(helmet());

aplicacao.use(cors(criarOpcoesCors(env.CORS_ORIGINS)));

aplicacao.use(express.json());



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

roteadorApi.use("/autenticacao", authRouter);

roteadorApi.use(middlewareAutenticacao);
roteadorApi.use("/exemplos", exemploRouter);
roteadorApi.use("/admin", adminRouter);
roteadorApi.use("/usuarios", usuariosRouter);
roteadorApi.use("/amizade", amizadeRouter);
aplicacao.use("/api/v1", roteadorApi);


aplicacao.use((_request, _response, next) => {

  next(

    new ErroAplicacao({

      codigoStatus: 404,

      codigo: CodigoDeErro.NAO_ENCONTRADO,

      mensagem: MENSAGENS.rotaNaoEncontrada,

    }),

  );

});



aplicacao.use(middlewareTratamentoErros);



export { aplicacao };

