import type { ValorCodigoDeErro } from "@/shared/errors/codigos-de-erro";

type ParametrosErroAplicacao = {
  mensagem: string;
  codigo: ValorCodigoDeErro;
  codigoStatus: number;
  detalhes?: unknown;
};

/**
 * Erro de dominio do Usuario-Service.
 *
 * Carrega, alem da mensagem, o status HTTP, um codigo estavel para o cliente e
 * detalhes opcionais. O middleware central de erros usa esses campos prontos.
 */
export class ErroAplicacao extends Error {
  public readonly codigo: ValorCodigoDeErro;
  public readonly codigoStatus: number;
  public readonly detalhes?: unknown;

  constructor({ mensagem, codigo, codigoStatus, detalhes }: ParametrosErroAplicacao) {
    super(mensagem);
    // Nome fixo para identificar este tipo de erro nos logs.
    this.name = "ErroAplicacao";
    this.codigo = codigo;
    this.codigoStatus = codigoStatus;
    this.detalhes = detalhes;
  }
}
