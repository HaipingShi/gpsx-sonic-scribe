-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AudioChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "isSilence" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AudioChunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chunkId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "providerResponseJson" TEXT NOT NULL,
    CONSTRAINT "DraftSegment_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "AudioChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fullTextPath" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DraftDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PolishedSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftSegmentId" TEXT NOT NULL,
    "polishedText" TEXT NOT NULL,
    "supervisorNotes" TEXT,
    "status" TEXT NOT NULL,
    CONSTRAINT "PolishedSegment_draftSegmentId_fkey" FOREIGN KEY ("draftSegmentId") REFERENCES "DraftSegment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "contentPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DraftSegment_chunkId_key" ON "DraftSegment"("chunkId");

-- CreateIndex
CREATE UNIQUE INDEX "PolishedSegment_draftSegmentId_key" ON "PolishedSegment"("draftSegmentId");
