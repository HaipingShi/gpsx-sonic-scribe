-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DraftSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chunkId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "providerResponseJson" TEXT NOT NULL,
    "retryAttempt" INTEGER NOT NULL DEFAULT 0,
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "validationResult" TEXT,
    CONSTRAINT "DraftSegment_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "AudioChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DraftSegment" ("chunkId", "confidence", "id", "providerResponseJson", "rawText") SELECT "chunkId", "confidence", "id", "providerResponseJson", "rawText" FROM "DraftSegment";
DROP TABLE "DraftSegment";
ALTER TABLE "new_DraftSegment" RENAME TO "DraftSegment";
CREATE UNIQUE INDEX "DraftSegment_chunkId_key" ON "DraftSegment"("chunkId");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'MANUAL',
    "checkpoint" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "promptConfig" TEXT
);
INSERT INTO "new_Project" ("createdAt", "filePath", "id", "originalFilename", "promptConfig", "status", "updatedAt") SELECT "createdAt", "filePath", "id", "originalFilename", "promptConfig", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
