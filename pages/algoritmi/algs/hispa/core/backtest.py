from __future__ import annotations

from dataclasses import dataclass

from .io_utils import DrawRow
from .model import ORDERS, HispaState, create_state, predict_from_query, update_state_with_event


@dataclass
class BacktestResult:
    state: HispaState
    historical_rows: list[dict[str, str]]
    next_pick: list[int]
    common_metrics: list[dict[str, str]]
    contrib_by_order_last: dict[int, float]
    matched_patterns_last: dict[int, int]
    matched_events_last: dict[int, int]
    last_seq: int


def _hits_count(row: dict[str, str]) -> int:
    return sum(
        1
        for key in ("N1", "N2", "N3", "N4", "N5", "N6")
        if row.get(key, "").startswith("[")
    )


def _build_common_metrics(
    historical_rows: list[dict[str, str]],
    archive_last_seq: int,
    last_date: str,
) -> list[dict[str, str]]:
    hits = [_hits_count(r) for r in historical_rows]
    n = len(hits)
    mean_hits = (sum(hits) / n) if n else 0.0
    ge2 = sum(1 for h in hits if h >= 2)
    ge2_pct = (ge2 / n) * 100 if n else 0.0
    exact = {k: sum(1 for h in hits if h == k) for k in range(0, 7)}
    streak = 0
    curr = 0
    for h in hits:
        if h >= 1:
            curr += 1
            streak = max(streak, curr)
        else:
            curr = 0
    last100 = hits[-100:] if len(hits) >= 100 else hits
    last100_mean = (sum(last100) / len(last100)) if last100 else 0.0
    rows = [
        {
            "METRICA": "Concorsi analizzati",
            "VALORE": str(max(0, archive_last_seq)),
            "NOTE": f"Conteggio archivio fino al concorso {archive_last_seq}",
        },
        {
            "METRICA": "Media hit/sestina",
            "VALORE": f"{mean_hits:.2f}",
            "NOTE": "Media numeri corretti per concorso",
        },
        {
            "METRICA": "Hit rate >= 2",
            "VALORE": f"{ge2_pct:.1f}%",
            "NOTE": "Percentuale concorsi con almeno 2 hit",
        },
    ]
    for k in range(0, 7):
        rows.append(
            {
                "METRICA": f"Con {k} hit",
                "VALORE": str(exact[k]),
                "NOTE": f"Numero concorsi con esattamente {k} hit",
            }
        )
    rows.extend(
        [
            {
                "METRICA": "Best streak",
                "VALORE": str(streak),
                "NOTE": "Massima sequenza di concorsi con almeno 1 hit",
            },
            {
                "METRICA": "Media hit ultimi 100",
                "VALORE": f"{last100_mean:.2f}",
                "NOTE": "Ultimi 100 concorsi o meno",
            },
            {
                "METRICA": "Ultimo concorso calcolato",
                "VALORE": str(archive_last_seq),
                "NOTE": f"Data estrazione: {last_date}",
            },
        ]
    )
    return rows


def run_incremental_backtest(
    draws: list[DrawRow],
    historical: list[dict[str, str]],
) -> BacktestResult:
    seq_to_index = {d.seq: i for i, d in enumerate(draws)}
    hist_rows = list(historical)

    if hist_rows:
        try:
            last_seq_hist = int(hist_rows[-1]["NR. SEQUENZIALE"])
        except Exception:
            hist_rows = []
            last_seq_hist = 0
        if last_seq_hist not in seq_to_index or last_seq_hist > draws[-1].seq:
            hist_rows = []
            last_seq_hist = 0
        else:
            expected_rows = seq_to_index[last_seq_hist]
            if len(hist_rows) > expected_rows:
                hist_rows = []
                last_seq_hist = 0
    else:
        last_seq_hist = 0

    state = create_state()
    contrib_last = {o: 0.0 for o in ORDERS}
    matched_patterns_last = {o: 0 for o in ORDERS}
    matched_events_last = {o: 0 for o in ORDERS}

    replay_end = seq_to_index[last_seq_hist] if last_seq_hist > 0 else 0
    for i in range(1, replay_end + 1):
        update_state_with_event(
            state=state,
            occurrence_draw=draws[i - 1].numbers,
            next_draw=draws[i].numbers,
        )

    for i in range(1, len(draws)):
        current = draws[i]
        if current.seq <= last_seq_hist:
            continue
        predicted, contrib, matched_patterns, matched_events = predict_from_query(
            state=state,
            query_draw=draws[i - 1].numbers,
        )
        actual = set(current.numbers)
        cells = [f"[{n:02d}]" if n in actual else f"{n:02d}" for n in predicted]
        hist_rows.append(
            {
                "NR. SEQUENZIALE": str(current.seq),
                "DATA": current.date,
                "N1": cells[0],
                "N2": cells[1],
                "N3": cells[2],
                "N4": cells[3],
                "N5": cells[4],
                "N6": cells[5],
            }
        )
        contrib_last = contrib
        matched_patterns_last = matched_patterns
        matched_events_last = matched_events
        update_state_with_event(
            state=state,
            occurrence_draw=draws[i - 1].numbers,
            next_draw=draws[i].numbers,
        )

    next_pick, contrib_last, matched_patterns_last, matched_events_last = predict_from_query(
        state=state,
        query_draw=draws[-1].numbers,
    )
    common_metrics = _build_common_metrics(
        historical_rows=hist_rows,
        archive_last_seq=draws[-1].seq,
        last_date=draws[-1].date,
    )

    return BacktestResult(
        state=state,
        historical_rows=hist_rows,
        next_pick=next_pick,
        common_metrics=common_metrics,
        contrib_by_order_last=contrib_last,
        matched_patterns_last=matched_patterns_last,
        matched_events_last=matched_events_last,
        last_seq=draws[-1].seq,
    )

