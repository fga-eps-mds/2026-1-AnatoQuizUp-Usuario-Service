import type { NacionalidadesAlunoDto } from "@/modules/auth/aluno/nacionalidades/dto/resposta.nacionalidade.types";
import { NACIONALIDADES_ALUNO_OPCOES } from "@/shared/constants/nacionalidades";

// Service de nacionalidades: devolve as opcoes para o formulario de cadastro.
export class AlunoNacionalidadesService {
  // Copia o array de constantes para nao expor a referencia interna (somente leitura).
  listarNacionalidades(): NacionalidadesAlunoDto {
    return [...NACIONALIDADES_ALUNO_OPCOES];
  }
}
