-- CreateTable
CREATE TABLE "odds_snapshots" (
    "id" TEXT NOT NULL,
    "fixture_id" TEXT NOT NULL,
    "book" TEXT NOT NULL DEFAULT 'pinnacle',
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "close_fair_prob" DOUBLE PRECISION,
    "clv" DOUBLE PRECISION,
    "won" BOOLEAN,
    "taken_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odds_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "odds_snapshots_fixture_id_book_market_selection_key" ON "odds_snapshots"("fixture_id", "book", "market", "selection");

-- CreateIndex
CREATE INDEX "odds_snapshots_fixture_id_idx" ON "odds_snapshots"("fixture_id");

-- CreateIndex
CREATE INDEX "odds_snapshots_taken_at_idx" ON "odds_snapshots"("taken_at" DESC);

-- AddForeignKey
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
