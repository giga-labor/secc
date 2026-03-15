from __future__ import annotations

from dataclasses import dataclass, field
from itertools import combinations


ORDERS = (1, 2, 3, 4, 5, 6)
W = {1: 1.00, 2: 1.80, 3: 3.20, 4: 5.00, 5: 4.20, 6: 3.00}
K = {1: 20.0, 2: 10.0, 3: 6.0, 4: 4.0, 5: 3.0, 6: 2.0}
ALPHA = 0.5


@dataclass
class PatternStat:
    freq: int = 0
    next_number_counts: dict[int, int] = field(default_factory=dict)


@dataclass
class HispaState:
    stats_by_order: dict[int, dict[tuple[int, ...], PatternStat]]
    events_seen: int = 0


def create_state() -> HispaState:
    return HispaState(stats_by_order={o: {} for o in ORDERS})


def _sorted_unique(nums: list[int]) -> tuple[int, ...]:
    return tuple(sorted({int(n) for n in nums if 1 <= int(n) <= 90}))


def generate_patterns(draw_numbers: list[int]) -> list[tuple[int, tuple[int, ...]]]:
    nums = _sorted_unique(draw_numbers)
    out: list[tuple[int, tuple[int, ...]]] = []
    for o in ORDERS:
        out.extend((o, combo) for combo in combinations(nums, o))
    return out


def pattern_weight(order: int, freq: int) -> float:
    if freq <= 0:
        return 0.0
    return W[order] * (freq ** (1.0 - ALPHA)) / (freq + K[order])


def update_state_with_event(
    state: HispaState,
    occurrence_draw: list[int],
    next_draw: list[int],
) -> None:
    patterns = generate_patterns(occurrence_draw)
    next_unique = _sorted_unique(next_draw)
    for order, pattern in patterns:
        bucket = state.stats_by_order[order]
        stat = bucket.get(pattern)
        if stat is None:
            stat = PatternStat()
            bucket[pattern] = stat
        stat.freq += 1
        for n in next_unique:
            stat.next_number_counts[n] = stat.next_number_counts.get(n, 0) + 1
    state.events_seen += 1


def _fallback_from_query(query_draw: list[int]) -> list[int]:
    picks = list(_sorted_unique(query_draw))[:6]
    used = set(picks)
    for n in range(1, 91):
        if n in used:
            continue
        picks.append(n)
        if len(picks) == 6:
            break
    return picks


def predict_from_query(
    state: HispaState,
    query_draw: list[int],
) -> tuple[list[int], dict[int, float], dict[int, int], dict[int, int]]:
    scores = {n: 0.0 for n in range(1, 91)}
    contrib_by_order = {o: 0.0 for o in ORDERS}
    matched_patterns_by_order = {o: 0 for o in ORDERS}
    matched_events_by_order = {o: 0 for o in ORDERS}

    for order, pattern in generate_patterns(query_draw):
        stat = state.stats_by_order[order].get(pattern)
        if stat is None or stat.freq <= 0:
            continue
        matched_patterns_by_order[order] += 1
        matched_events_by_order[order] += stat.freq
        weight = pattern_weight(order, stat.freq)
        if weight <= 0.0:
            continue
        for n, cnt in stat.next_number_counts.items():
            contrib = weight * float(cnt)
            scores[n] += contrib
            contrib_by_order[order] += contrib

    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
    pick = [n for n, _ in ranked[:6]]
    if sum(scores.values()) <= 0.0:
        pick = _fallback_from_query(query_draw)

    return pick, contrib_by_order, matched_patterns_by_order, matched_events_by_order

