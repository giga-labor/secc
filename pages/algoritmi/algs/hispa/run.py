#!/usr/bin/env python3
from __future__ import annotations

from core.engine import (
    build_algorithm_sheet_rows,
    build_analysis_text,
    build_specific_metrics,
    run_incremental_backtest,
)
from core.io_utils import (
    load_existing_historical,
    read_draws_csv,
    resolve_draws_path,
    resolve_out_dir,
    write_csv,
)


def main() -> None:
    draws_path = resolve_draws_path(__file__)
    out_dir = resolve_out_dir(__file__)
    draws = read_draws_csv(draws_path)
    if len(draws) < 2:
        raise ValueError("Servono almeno 2 concorsi in draws.csv")

    hist_path = out_dir / "historical-db.csv"
    historical = load_existing_historical(hist_path)

    result = run_incremental_backtest(draws=draws, historical=historical)

    next_pick_text = " ".join(f"{n:02d}" for n in result.next_pick)
    metrics = result.common_metrics
    metrics.extend(build_specific_metrics(result))
    metrics.extend(
        [
            {
                "METRICA": "Concorso successivo stimato",
                "VALORE": str(result.last_seq + 1),
                "NOTE": f"Sestina proposta: {next_pick_text}",
            },
            {
                "METRICA": "Sestina proposta (prossimo concorso)",
                "VALORE": next_pick_text,
                "NOTE": "Pronostico prodotto con backtest progressivo HiSPA",
            },
        ]
    )

    write_csv(
        out_dir / "historical-db.csv",
        ["NR. SEQUENZIALE", "DATA", "N1", "N2", "N3", "N4", "N5", "N6"],
        result.historical_rows,
    )
    write_csv(out_dir / "metrics-db.csv", ["METRICA", "VALORE", "NOTE"], metrics)
    write_csv(
        out_dir / "algorithm-sheet.csv",
        ["CHIAVE", "VALORE"],
        build_algorithm_sheet_rows(),
    )
    (out_dir / "analysis.txt").write_text(
        build_analysis_text(draws_count=len(draws), last_seq=result.last_seq),
        encoding="utf-8",
    )

    print(f"Draws: {draws_path}")
    print(f"Rows read: {len(draws)}")
    print(f"Historical rows: {len(result.historical_rows)}")
    print(f"Generated: {out_dir}")


if __name__ == "__main__":
    main()

