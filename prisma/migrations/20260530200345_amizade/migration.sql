-- CreateEnum
CREATE TYPE "StatusAmizade" AS ENUM ('PENDENTE', 'ATIVO', 'RECUSADO');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "visivel" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "amizades" (
    "id" TEXT NOT NULL,
    "usuarioOrigemId" TEXT NOT NULL,
    "usuarioDestinoId" TEXT NOT NULL,
    "statusAmizade" "StatusAmizade" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "excluidoEm" TIMESTAMP(3),

    CONSTRAINT "amizades_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "amizades" ADD CONSTRAINT "usuario_origem_fk" FOREIGN KEY ("usuarioOrigemId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amizades" ADD CONSTRAINT "usuario_destino_fk" FOREIGN KEY ("usuarioDestinoId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
