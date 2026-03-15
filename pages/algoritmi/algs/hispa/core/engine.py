from __future__ import annotations

from .backtest import BacktestResult, run_incremental_backtest
from .model import ALPHA, K, ORDERS, W


def _order_label(order: int) -> str:
    return {
        1: "singoli",
        2: "coppie",
        3: "terzine",
        4: "quartine",
        5: "cinquine",
        6: "sestina",
    }.get(order, f"ordine-{order}")


def build_specific_metrics(result: BacktestResult) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for o in ORDERS:
        label = _order_label(o)
        rows.append(
            {
                "METRICA": f"Pattern query match ({label})",
                "VALORE": str(result.matched_patterns_last.get(o, 0)),
                "NOTE": "Pattern della query con frequenza storica > 0",
            }
        )
        rows.append(
            {
                "METRICA": f"Eventi storici match ({label})",
                "VALORE": str(result.matched_events_last.get(o, 0)),
                "NOTE": "Somma frequenze dei pattern matchati",
            }
        )
        rows.append(
            {
                "METRICA": f"Contributo score ({label})",
                "VALORE": f"{result.contrib_by_order_last.get(o, 0.0):.4f}",
                "NOTE": "Contributo allo score della proposta corrente",
            }
        )
    rows.append(
        {
            "METRICA": "Eventi progressivi processati",
            "VALORE": str(result.state.events_seen),
            "NOTE": "Numero eventi t->t+1 assorbiti dal motore HiSPA",
        }
    )
    return rows


def build_algorithm_sheet_rows() -> list[dict[str, str]]:
    w_text = " | ".join(f"W{o}={W[o]:.2f}" for o in ORDERS)
    k_text = " | ".join(f"k{o}={int(K[o])}" for o in ORDERS)
    return [
        {
            "CHIAVE": "INTRO",
            "VALORE": "HiSPA e un algoritmo statistico progressivo che usa i pattern della sestina N per stimare N+1 tramite memoria storica dei successivi.",
        },
        {
            "CHIAVE": "SCOPO",
            "VALORE": "Costruire ranking dei 90 numeri con evidenza condizionata storica e proporre una sestina top-6 senza leakage temporale.",
        },
        {
            "CHIAVE": "INPUT",
            "VALORE": "draws.csv ordinato per NR. SEQUENZIALE | query=N | ricerca pattern su 1..N-1 | verifica su N+1",
        },
        {
            "CHIAVE": "METODO",
            "VALORE": "63 pattern della query (ordini 1..6) | peso_pattern=W[o]*f^(1-alpha)/(f+k[o]) | score numero da concorsi successivi agli eventi storici matchati",
        },
        {
            "CHIAVE": "OUTPUT",
            "VALORE": "historical-db.csv progressivo con hit marcati | metrics-db.csv | algorithm-sheet.csv | analysis.txt",
        },
        {
            "CHIAVE": "LIMITI",
            "VALORE": "Metodo statistico condizionato non causale | sensibilita a densita storica pattern | nessuna garanzia predittiva futura.",
        },
        {
            "CHIAVE": "PARAMETRI",
            "VALORE": f"alpha={ALPHA:.2f} | {w_text} | {k_text}",
        },
    ]


def build_analysis_text(draws_count: int, last_seq: int) -> str:
    return (
        f"HiSPA incrementale: storico aggiornato fino al concorso {last_seq} su {draws_count} estrazioni. "
        "Per ogni target t usa la sestina reale t-1 come query, ricerca pattern su 1..t-2, "
        "propaga score dai concorsi successivi e produce proposta top-6 con pipeline SECC out/*. "
        "Architettura separata: run.py interfaccia, logica in core/."
    )


__all__ = [
    "run_incremental_backtest",
    "build_specific_metrics",
    "build_algorithm_sheet_rows",
    "build_analysis_text",
]

