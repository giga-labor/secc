from __future__ import annotations

import csv
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass
class DrawRow:
    seq: int
    date: str
    numbers: list[int]


def detect_delimiter(header_line: str) -> str:
    return ";" if header_line.count(";") > header_line.count(",") else ","


def _base_dir(anchor_file: str) -> Path:
    return Path(anchor_file).resolve().parents[2]


def _secc_root(anchor_file: str) -> Path:
    return Path(anchor_file).resolve().parents[4]


def resolve_draws_path(anchor_file: str) -> Path:
    env_path = os.getenv("SECC_ADMIN_DRAWS_PATH", "").strip()
    if env_path:
        return Path(env_path).resolve()
    candidates = (
        _secc_root(anchor_file) / "archives" / "draws" / "draws.csv",
        _secc_root(anchor_file) / "data" / "draws" / "draws.csv",
        _base_dir(anchor_file) / "data" / "draws" / "draws.csv",
    )
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def resolve_out_dir(anchor_file: str) -> Path:
    return Path(anchor_file).resolve().parent / "out"


def read_draws_csv(path: Path) -> list[DrawRow]:
    raw = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if not raw:
        raise ValueError(f"Input file is empty: {path}")
    reader = csv.DictReader(raw, delimiter=detect_delimiter(raw[0]))
    rows: list[DrawRow] = []
    for rec in reader:
        seq = int(str(rec["NR. SEQUENZIALE"]).strip())
        date = str(rec["DATA"]).strip()
        nums = [int(str(rec[f"N{i}"]).strip()) for i in range(1, 7)]
        rows.append(DrawRow(seq=seq, date=date, numbers=nums))
    rows.sort(key=lambda x: x.seq)
    return rows


def write_csv(path: Path, headers: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def load_existing_historical(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    raw = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if not raw:
        return []
    reader = csv.DictReader(raw, delimiter=detect_delimiter(raw[0]))
    out: list[dict[str, str]] = []
    for rec in reader:
        row = {k: str(v or "").strip() for k, v in rec.items()}
        if row.get("NR. SEQUENZIALE", "").isdigit():
            out.append(row)
    return out

