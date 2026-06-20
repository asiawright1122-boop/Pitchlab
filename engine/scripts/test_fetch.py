import os
import sys
from pathlib import Path

import pandas as pd
import requests

# Add the engine root to python path to import pitchlab modules
sys.path.append(str(Path(__file__).parent.parent))

from pitchlab.odds.devig import devig_power

FIXTURES_URL = "https://www.football-data.co.uk/fixtures.csv"

# The top leagues we care about
TARGET_LEAGUES = {"E0", "SP1", "D1", "I1", "F1", "B1"}

def main():
    print(f"[*] Downloading fixtures from {FIXTURES_URL} ...")
    resp = requests.get(FIXTURES_URL, timeout=10)
    resp.raise_for_status()
    
    # Save to a temporary file
    temp_csv = "temp_fixtures.csv"
    with open(temp_csv, "wb") as f:
        f.write(resp.content)
        
    print("[*] Parsing CSV...")
    # Use utf-8-sig to automatically handle the BOM (Byte Order Mark) at the start of the file
    df = pd.read_csv(temp_csv, encoding="utf-8-sig")
    os.remove(temp_csv)
    
    # Also strip whitespace from column names just in case
    df.columns = df.columns.str.strip()
    
    # Filter by target leagues
    if "Div" in df.columns:
        df = df[df["Div"].isin(TARGET_LEAGUES)].copy()
    
    # Drop rows without Average odds (AvgH, AvgD, AvgA)
    df = df.dropna(subset=["AvgH", "AvgD", "AvgA"])
    
    print(f"[*] Found {len(df)} upcoming matches in major leagues with valid odds.\n")
    
    # Show the first 5 matches as a proof of concept
    for idx, row in df.head(5).iterrows():
        league = row["Div"]
        date = row["Date"]
        time = row.get("Time", "")
        home = row["HomeTeam"]
        away = row["AwayTeam"]
        
        # Opening/Average Odds
        avg_h, avg_d, avg_a = float(row["AvgH"]), float(row["AvgD"]), float(row["AvgA"])
        
        # Apply Power Devig to get True Probabilities
        try:
            p_h, p_d, p_a = devig_power([avg_h, avg_d, avg_a])
            
            print(f"⚽ {league} | {date} {time} | {home} vs {away}")
            print(f"   📊 市场平均赔率: 胜 {avg_h:.2f} | 平 {avg_d:.2f} | 负 {avg_a:.2f}")
            print(f"   🤖 AI 去水概率: 胜 {p_h*100:.1f}% | 平 {p_d*100:.1f}% | 负 {p_a*100:.1f}%\n")
        except Exception as e:
            print(f"Error processing {home} vs {away}: {e}")

if __name__ == "__main__":
    main()
