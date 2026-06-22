-- CreateTable
CREATE TABLE IF NOT EXISTS "cat_lineage" (
    "id" TEXT NOT NULL,
    "serialId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "daysLived" INTEGER NOT NULL DEFAULT 0,
    "fishSpent" INTEGER NOT NULL DEFAULT 0,
    "bestCombo" INTEGER NOT NULL DEFAULT 0,
    "intimacy" INTEGER NOT NULL DEFAULT 0,
    "releaseType" TEXT NOT NULL DEFAULT '主动送走',
    "dateLeft" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_lineage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cat_serial_registry" (
    "id" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "serialNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "currentOwnerId" TEXT,
    "firstOwnerId" TEXT,
    "availableAfter" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_serial_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cat_species" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "activeSkill" JSONB NOT NULL,
    "passiveSkill" JSONB NOT NULL,
    "weight" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "cat_species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cat_personalities" (
    "id" SERIAL NOT NULL,
    "personalityId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "effectType" TEXT NOT NULL,
    "effectDesc" TEXT NOT NULL,
    "affectsFish" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_personalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "checkin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "checkin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_boards" (
    "date" DATE NOT NULL,
    "seed" BIGINT NOT NULL,

    CONSTRAINT "daily_boards_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "fish_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fish_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "game_sessions" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "boardDate" DATE NOT NULL,
    "score" INTEGER NOT NULL,
    "fishEarned" INTEGER NOT NULL,
    "activeCats" JSONB NOT NULL,
    "comboCount" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "player_cats" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "serialId" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'bag',
    "slotPosition" INTEGER,
    "bagExpiresAt" TIMESTAMP(3),
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personality" JSONB NOT NULL,
    "intimacy" INTEGER NOT NULL DEFAULT 0,
    "lastFedAt" TIMESTAMP(3),
    "gamesWitnessed" INTEGER NOT NULL DEFAULT 0,
    "bestCombo" INTEGER NOT NULL DEFAULT 0,
    "fishSpent" INTEGER NOT NULL DEFAULT 0,
    "daysAlive" INTEGER NOT NULL DEFAULT 0,
    "releasedAt" TIMESTAMP(3),
    "coolingUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_cats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_milestones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalFish" INTEGER NOT NULL DEFAULT 0,
    "maxCombo" INTEGER NOT NULL DEFAULT 0,
    "catsOwned" INTEGER NOT NULL DEFAULT 0,
    "catsReleased" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "pityCount" INTEGER NOT NULL DEFAULT 0,
    "bells" INTEGER NOT NULL DEFAULT 3,
    "activeTitle" TEXT NOT NULL DEFAULT '新手铲屎官',
    "gameData" JSONB,
    "lastNicknameChange" TIMESTAMP(3),
    "hasClaimedFirstGacha" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cat_serial_registry_speciesId_serialNumber_key" ON "cat_serial_registry"("speciesId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cat_species_name_key" ON "cat_species"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cat_personalities_personalityId_key" ON "cat_personalities"("personalityId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cat_personalities_name_key" ON "cat_personalities"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "checkin_userId_date_key" ON "checkin"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "player_cats_serialId_key" ON "player_cats"("serialId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_milestones_userId_key" ON "user_milestones"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- AddForeignKey (skip if already exists)
DO $$ BEGIN
    ALTER TABLE "cat_lineage" ADD CONSTRAINT "cat_lineage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "cat_lineage" ADD CONSTRAINT "cat_lineage_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "cat_serial_registry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "cat_serial_registry" ADD CONSTRAINT "cat_serial_registry_currentOwnerId_fkey" FOREIGN KEY ("currentOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "cat_serial_registry" ADD CONSTRAINT "cat_serial_registry_firstOwnerId_fkey" FOREIGN KEY ("firstOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "cat_serial_registry" ADD CONSTRAINT "cat_serial_registry_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "cat_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "checkin" ADD CONSTRAINT "checkin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "fish_ledger" ADD CONSTRAINT "fish_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "player_cats" ADD CONSTRAINT "player_cats_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "player_cats" ADD CONSTRAINT "player_cats_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "cat_serial_registry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
