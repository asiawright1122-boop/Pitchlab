"""L2 cleaning / standardization layer.

The same team appears under different names across sources ("Man Utd",
"Man United", "Manchester United"; "Turkey" / "Türkiye"). Without a canonical
mapping the system thinks they are different teams and everything downstream
breaks. This layer maintains an extensible, persistable name registry — a
compounding data-layer moat that thickens the longer the system runs.
"""
