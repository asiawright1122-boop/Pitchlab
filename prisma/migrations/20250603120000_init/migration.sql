-- CreateTable
CREATE TABLE "pipeline_runs" (
    "id" TEXT NOT NULL,
    "pipeline" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "log" JSONB,

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "published_artifacts" (
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "source" TEXT,
    "generated_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL,
    "run_id" TEXT,

    CONSTRAINT "published_artifacts_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "fixtures" (
    "id" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "home" TEXT NOT NULL,
    "away" TEXT NOT NULL,
    "kickoff_utc" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "home_goals" INTEGER,
    "away_goals" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "fixture_id" TEXT,
    "model_version" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "prob" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_runs_pipeline_started_at_idx" ON "pipeline_runs"("pipeline", "started_at" DESC);

-- CreateIndex
CREATE INDEX "fixtures_league_kickoff_utc_idx" ON "fixtures"("league", "kickoff_utc");

-- CreateIndex
CREATE INDEX "predictions_fixture_id_market_idx" ON "predictions"("fixture_id", "market");

-- AddForeignKey
ALTER TABLE "published_artifacts" ADD CONSTRAINT "published_artifacts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "pipeline_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
