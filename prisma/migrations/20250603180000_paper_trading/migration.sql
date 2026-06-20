-- CreateTable
CREATE TABLE "paper_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "currency" TEXT NOT NULL DEFAULT 'research_units',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_trades" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fixture_id" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "home" TEXT NOT NULL,
    "away" TEXT NOT NULL,
    "kickoff_utc" TIMESTAMP(3) NOT NULL,
    "market" TEXT NOT NULL DEFAULT '1x2',
    "selection" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "pnl" DOUBLE PRECISION,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paper_wallets_user_id_key" ON "paper_wallets"("user_id");

-- CreateIndex
CREATE INDEX "paper_trades_user_id_status_idx" ON "paper_trades"("user_id", "status");

-- CreateIndex
CREATE INDEX "paper_trades_fixture_id_idx" ON "paper_trades"("fixture_id");

-- AddForeignKey
ALTER TABLE "paper_wallets" ADD CONSTRAINT "paper_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
