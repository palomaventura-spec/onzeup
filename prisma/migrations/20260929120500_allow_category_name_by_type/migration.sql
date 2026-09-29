DROP INDEX IF EXISTS "Category_organizationId_name_sport_key";

CREATE UNIQUE INDEX "Category_organizationId_name_sport_type_key"
ON "Category"("organizationId", "name", "sport", "type");