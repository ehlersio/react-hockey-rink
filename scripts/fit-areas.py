#!/usr/bin/env python3
"""Fit (or check) the NHL shot-area boundaries in src/shotAreas.js.

The NHL publishes per-area shot counts for every goalie (NHL EDGE) but not
the areas' shapes. This script fits AREA_BOUNDS so that classifying each
goalie's shots on goal from the play-by-play reproduces those counts, then
checks the fit on goalies it didn't use. Everything comes from the NHL's
public API, so it needs no credentials; responses are cached on disk.

    python3 scripts/fit-areas.py            # check the shipped AREA_BOUNDS
    python3 scripts/fit-areas.py --fit      # refit from the hand-picked start
    python3 scripts/fit-areas.py --fit --start src   # refit from the shipped values

Data
  Goalies: the N goalies with the most shots against in the season (default
  16 to fit on, the next 14 held out), from the NHL stats API.
  Shots: every shot on goal and goal with that goalie in net, from each game's
  play-by-play (the goalie's game log says which games). Each is folded onto
  one net by the sign of the median x of that goalie's shots in that game and
  period, so the shot attacks right with the net at x = 89.
  Target: NHL EDGE's shotsAgainst per area for the same goalie and season.

Fit
  Nine parameters (see PARAMS); the red and blue lines are the NHL's and are
  not fitted. Objective: the sum over goalies and areas of the squared
  difference between our count and the NHL's. Minimised by coordinate
  descent: each parameter in turn is moved by +-1 or +-3 of its step, any
  move that lowers the error is kept, and the sweep repeats until no single
  move helps.

Checks
  The mirror image (L and R swapped) is scored too; it should be clearly
  worse. The held-out goalies' per-goalie mismatch (half the L1 distance
  between the two count vectors, over the goalie's shots) should match the
  fit set's.

Python 3.10+, standard library only.
"""

import argparse
import json
import math
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

GOAL_LINE_X = 89
BLUE_LINE_X = 25

STATS_API = "https://api.nhle.com/stats/rest/en"
WEB_API = "https://api-web.nhle.com/v1"
# api.nhle.com answers 403 to Python's default User-Agent.
USER_AGENT = "Mozilla/5.0 (react-hockey-rink fit-areas.py)"

# Parameter -> (src/shotAreas.js name, step). Order matters for the descent.
PARAMS = {
    "behindW": ("behindW", 1),  # behind the net: |y| within this; corners outside
    "creaseR": ("creaseR", 0.5),  # the crease: within this of the goal line's centre
    "innerR": ("innerR", 1),  # low slot / net sides / inner outside: within this
    "lowSlotDeg": ("lowSlotDeg", 2),  # low slot: within this of straight out
    "netSideDeg": ("netSideDeg", 2),  # net sides: lowSlotDeg..this; outside beyond
    "pointX": ("pointX", 1),  # x below this (to the blue line): the points
    "highSlotDeg": ("highSlotDeg", 1),  # past innerR: high slot within this
    "circleDeg": ("circleDeg", 2),  # circles highSlotDeg..this; outside beyond
    "pointW": ("pointW", 1),  # centre point: |y| within this
}

# The hand-picked values the 2026-10-02 fit started from.
START = {
    "behindW": 12,
    "creaseR": 6,
    "innerR": 22,
    "lowSlotDeg": 40,
    "netSideDeg": 70,
    "pointX": 55,
    "highSlotDeg": 25,
    "circleDeg": 60,
    "pointW": 12,
}

AREAS = [
    "Crease",
    "Low Slot",
    "L Net Side",
    "R Net Side",
    "High Slot",
    "L Circle",
    "R Circle",
    "Outside L",
    "Outside R",
    "Center Point",
    "L Point",
    "R Point",
    "Behind the Net",
    "L Corner",
    "R Corner",
    "Offensive Neutral Zone",
    "Beyond Red Line",
]


# ── Geometry: the same rules as shotArea() in src/shotAreas.js ──────────────


def shot_area(x, y, b, flip=False):
    if flip:
        y = -y
    L = y > 0
    if x < 0:
        return "Beyond Red Line"
    if x < BLUE_LINE_X:
        return "Offensive Neutral Zone"
    if x > GOAL_LINE_X:
        if abs(y) <= b["behindW"]:
            return "Behind the Net"
        return "L Corner" if L else "R Corner"
    d = GOAL_LINE_X - x
    r = math.hypot(d, y)
    deg = math.degrees(math.atan2(abs(y), d))
    if r <= b["creaseR"]:
        return "Crease"
    if r <= b["innerR"]:
        if deg <= b["lowSlotDeg"]:
            return "Low Slot"
        if deg <= b["netSideDeg"]:
            return "L Net Side" if L else "R Net Side"
        return "Outside L" if L else "Outside R"
    if x >= b["pointX"]:
        if deg <= b["highSlotDeg"]:
            return "High Slot"
        if deg <= b["circleDeg"]:
            return "L Circle" if L else "R Circle"
        return "Outside L" if L else "Outside R"
    if abs(y) <= b["pointW"]:
        return "Center Point"
    return "L Point" if L else "R Point"


# ── Data ─────────────────────────────────────────────────────────────────────


class Api:
    """GET JSON from the NHL's public API, cached on disk."""

    def __init__(self, cache_dir, quiet=False):
        self.dir = Path(cache_dir)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.quiet = quiet
        self.fetched = 0

    def get(self, url):
        name = re.sub(r"[^A-Za-z0-9._-]+", "_", url.split("://", 1)[1]) + ".json"
        path = self.dir / name
        if path.exists():
            return json.loads(path.read_text())
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = json.load(r)
                break
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    data = None
                    break
                if attempt == 2:
                    raise
                time.sleep(2 * (attempt + 1))
            except (urllib.error.URLError, TimeoutError):
                if attempt == 2:
                    raise
                time.sleep(2 * (attempt + 1))
        path.write_text(json.dumps(data))
        self.fetched += 1
        if not self.quiet and self.fetched % 50 == 0:
            print(f"  ... {self.fetched} requests", file=sys.stderr)
        return data


def top_goalies(api, season, n):
    """The n goalies with the most shots against (regular season)."""
    sort = '[{"property":"shotsAgainst","direction":"DESC"}]'
    url = (
        f"{STATS_API}/goalie/summary?limit={n}&sort={urllib.request.quote(sort)}"
        f"&cayenneExp=seasonId={season}%20and%20gameTypeId=2"
    )
    rows = api.get(url)["data"]
    return [(g["playerId"], g["goalieFullName"], g["shotsAgainst"]) for g in rows[:n]]


def edge_counts(api, goalie_id, season):
    """NHL EDGE shots against per area, or None when the NHL has no data."""
    d = api.get(f"{WEB_API}/edge/goalie-shot-location-detail/{goalie_id}/{season}/2")
    if not d or not d.get("shotLocationDetails"):
        return None
    return {a["area"]: a["shotsAgainst"] or 0 for a in d["shotLocationDetails"]}


def goalie_shots(api, goalie_id, season):
    """[(x, y)] of every shot on goal or goal with this goalie in net, folded
    so the shot attacks right."""
    log = api.get(f"{WEB_API}/player/{goalie_id}/game-log/{season}/2")
    games = [g["gameId"] for g in (log or {}).get("gameLog", [])]
    by_period = defaultdict(list)
    for game_id in games:
        pbp = api.get(f"{WEB_API}/gamecenter/{game_id}/play-by-play")
        for p in (pbp or {}).get("plays", []):
            if p.get("typeDescKey") not in ("shot-on-goal", "goal"):
                continue
            det = p.get("details", {})
            if det.get("goalieInNetId") != goalie_id:
                continue
            x, y = det.get("xCoord"), det.get("yCoord")
            if x is None:
                continue
            by_period[(game_id, p["periodDescriptor"]["number"])].append((x, y or 0))
    shots = []
    for pts in by_period.values():
        xs = sorted(x for x, _ in pts)
        sign = 1 if xs[len(xs) // 2] > 0 else -1
        shots += [(x * sign, y * sign) for x, y in pts]
    return shots


def load_set(api, goalies, season, label):
    out = []
    for gid, name, _ in goalies:
        edge = edge_counts(api, gid, season)
        if edge is None:
            print(f"  {name}: no EDGE area data, skipped", file=sys.stderr)
            continue
        out.append((gid, name, goalie_shots(api, gid, season), edge))
    n_shots = sum(len(s) for _, _, s, _ in out)
    print(f"{label}: {len(out)} goalies, {n_shots:,} shots on goal", file=sys.stderr)
    return out


# ── Fit ──────────────────────────────────────────────────────────────────────


def classify_all(data, b, flip=False):
    """{goalie: Counter(area -> our count)}."""
    return {gid: Counter(shot_area(x, y, b, flip) for x, y in shots) for gid, _, shots, _ in data}


def sq_error(data, b, flip=False):
    ours = classify_all(data, b, flip)
    return sum((edge.get(a, 0) - ours[gid][a]) ** 2 for gid, _, _, edge in data for a in AREAS)


def mismatch(data, b):
    """Per goalie: half the L1 distance between the two count vectors over the
    goalie's EDGE shots. Returns (average, worst)."""
    ours = classify_all(data, b)
    per = []
    for gid, _, _, edge in data:
        total = sum(edge.values()) or 1
        per.append(sum(abs(edge.get(a, 0) - ours[gid][a]) for a in AREAS) / 2 / total)
    return sum(per) / len(per), max(per)


def coordinate_descent(data, start, max_rounds=6, log=print):
    best = dict(start)
    best_err = sq_error(data, best)
    for rnd in range(1, max_rounds + 1):
        improved = True
        while improved:
            improved = False
            for key, (_, step) in PARAMS.items():
                for mult in (1, -1, 3, -3):
                    cand = dict(best)
                    cand[key] = best[key] + mult * step
                    err = sq_error(data, cand)
                    if err < best_err:
                        best, best_err, improved = cand, err, True
        log(f"round {rnd}: error {best_err:,.0f}  {fmt(best)}")
        if rnd > 1 and not improved:
            break
    return best, best_err


def fmt(b):
    return " ".join(f"{k}={b[k]:g}" for k in PARAMS)


def shipped_bounds(src_path):
    text = Path(src_path).read_text()
    block = re.search(r"AREA_BOUNDS\s*=\s*\{(.*?)\};", text, re.S).group(1)
    found = dict(re.findall(r"(\w+):\s*([\d.]+)", block))
    return {k: float(found[js]) for k, (js, _) in PARAMS.items()}


def report_areas(data, b):
    ours = classify_all(data, b)
    tot_edge, tot_ours = Counter(), Counter()
    for gid, _, _, edge in data:
        for a in AREAS:
            tot_edge[a] += edge.get(a, 0)
            tot_ours[a] += ours[gid][a]
    print(f"  {'area':24s} {'NHL':>7s} {'ours':>7s} {'diff':>6s}")
    for a in AREAS:
        print(f"  {a:24s} {tot_edge[a]:7d} {tot_ours[a]:7d} {tot_ours[a] - tot_edge[a]:+6d}")
    print(f"  {'total':24s} {sum(tot_edge.values()):7d} {sum(tot_ours.values()):7d}")


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--season", default="20252026", help="NHL season id (default 20252026)")
    ap.add_argument("--fit-goalies", type=int, default=16, help="goalies to fit on, by shots against")
    ap.add_argument("--holdout-goalies", type=int, default=14, help="next goalies, held out")
    ap.add_argument("--fit", action="store_true", help="refit; otherwise just score the shipped bounds")
    ap.add_argument("--start", default="hand", help="'hand' (the original start), 'src', or a JSON object")
    ap.add_argument("--cache", default=str(here.parent / ".cache" / "fit-areas"), help="API cache dir")
    ap.add_argument("--src", default=str(here.parent / "src" / "shotAreas.js"))
    args = ap.parse_args()

    api = Api(args.cache)
    goalies = top_goalies(api, args.season, args.fit_goalies + args.holdout_goalies)
    fit_set = load_set(api, goalies[: args.fit_goalies], args.season, "fit set")
    holdout = load_set(api, goalies[args.fit_goalies :], args.season, "held out")
    if api.fetched:
        print(f"({api.fetched} requests; cached in {args.cache})", file=sys.stderr)

    shipped = shipped_bounds(args.src)
    if args.fit:
        if args.start == "hand":
            start = dict(START)
        elif args.start == "src":
            start = shipped
        else:
            start = {**START, **json.loads(args.start)}
        print(f"start:   error {sq_error(fit_set, start):,.0f}  {fmt(start)}")
        bounds, _ = coordinate_descent(fit_set, start)
    else:
        bounds = shipped
        print(f"shipped: error {sq_error(fit_set, bounds):,.0f}  {fmt(bounds)}")

    print(f"mirror:  error {sq_error(fit_set, bounds, flip=True):,.0f}  (L/R swapped; should be clearly worse)")
    for label, data in (("fit set", fit_set), ("held out", holdout)):
        avg, worst = mismatch(data, bounds)
        print(f"{label}: {len(data)} goalies, per-goalie area mismatch avg {avg:.1%}, worst {worst:.1%}")
    print("totals over the fit set:")
    report_areas(fit_set, bounds)

    if args.fit:
        changed = {k for k in PARAMS if bounds[k] != shipped[k]}
        if changed:
            print("\nDiffers from src/shotAreas.js in: " + ", ".join(sorted(changed)))
        else:
            print("\nSame as src/shotAreas.js.")
        print("\nexport const AREA_BOUNDS = {")
        for k, (js, _) in PARAMS.items():
            print(f"  {js}: {bounds[k]:g},")
        print("};")


if __name__ == "__main__":
    main()
