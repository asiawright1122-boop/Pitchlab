from pitchlab.agent.pipelines.daily import daily_pipeline


def test_daily_pipeline_dag_structure():
    g = daily_pipeline()
    tasks = g._tasks

    assert "settle" in tasks
    assert "shadow_models" in tasks
    assert "league_export" in tasks
    assert "feedback_snapshot" in tasks

    assert tasks["shadow_models"].deps == ["settle"]
    assert tasks["league_export"].deps == ["shadow_models"]
    assert tasks["feedback_snapshot"].deps == ["shadow_models"]

