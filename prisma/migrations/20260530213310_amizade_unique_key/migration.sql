/*
  Warnings:

  - A unique constraint covering the columns `[usuarioOrigemId,usuarioDestinoId]` on the table `amizades` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "amizades_usuarioOrigemId_usuarioDestinoId_key" ON "amizades"("usuarioOrigemId", "usuarioDestinoId");
