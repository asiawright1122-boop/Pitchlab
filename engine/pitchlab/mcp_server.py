"""PitchLab Hermes MCP Server."""

from mcp.server.fastmcp import FastMCP
from pitchlab.models.shadow import build_shadow_payload
from pitchlab.agent.pipeline import PIPELINES
from pitchlab.agent.taskgraph import Context
from pitchlab.league.export import TOP_LEAGUES
import json

# Initialize FastMCP server
mcp = FastMCP("PitchLab")

@mcp.tool()
def pitchlab_shadow_compare(leagues: list[str] = list(TOP_LEAGUES), holdout: int = 30) -> str:
    """Compare champion and challenger (shadow) models across given leagues.
    
    Args:
        leagues: List of league codes to compare (e.g., ["E0", "E1"]). Default is all TOP_LEAGUES.
        holdout: Number of matches to use as holdout for evaluation. Default is 30.
        
    Returns:
        JSON string of the comparison results.
    """
    seasons = [2022, 2023, 2024]
    try:
        payload = build_shadow_payload(
            seasons=seasons,
            leagues=tuple(leagues),
            source="football-data",
            cache_dir=".cache",
            holdout=holdout,
            allow_auto_promote=False
        )
        return json.dumps(payload, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def pitchlab_pipeline_run(pipeline_name: str = "daily") -> str:
    """Run a PitchLab pipeline (e.g. 'daily' or 'worldcup').
    
    Args:
        pipeline_name: The name of the pipeline to run. Default is 'daily'.
        
    Returns:
        JSON string containing the statuses of the pipeline tasks.
    """
    if pipeline_name not in PIPELINES:
        return json.dumps({"error": f"Unknown pipeline '{pipeline_name}'. Available: {list(PIPELINES.keys())}"})
    
    try:
        p = PIPELINES[pipeline_name]()
        ctx = Context()
        statuses = p.run(ctx)
        
        return json.dumps({
            "pipeline": pipeline_name,
            "statuses": statuses
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    mcp.run()
