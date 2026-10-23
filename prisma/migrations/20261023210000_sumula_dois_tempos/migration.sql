-- 11UP - Sumula de futebol de campo: minutagem por primeiro e segundo tempos.
-- Migration aditiva e idempotente: banco previamente atualizado via db execute permanece valido.
ALTER TABLE "MatchAthleteStat"
  ADD COLUMN IF NOT EXISTS "firstHalfEntryMinute" INTEGER,
  ADD COLUMN IF NOT EXISTS "firstHalfExitMinute" INTEGER,
  ADD COLUMN IF NOT EXISTS "secondHalfEntryMinute" INTEGER,
  ADD COLUMN IF NOT EXISTS "secondHalfExitMinute" INTEGER;
