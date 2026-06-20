"""L5 strategy (value detection) and L6 staking (Kelly).

These two layers close the loop from "probabilities" to "money": compare the
model's probability against the de-vigged market to find +EV (value), then size
the bet with Kelly. Suggestions only — PitchLab never places bets.
"""
