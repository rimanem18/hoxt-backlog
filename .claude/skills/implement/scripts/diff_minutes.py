#!/usr/bin/env python3
import sys
from datetime import datetime


USAGE = """Usage:
  ./diff_minutes.py <start_iso_datetime> <end_iso_datetime>

Example:
  ./diff_minutes.py "2026-05-08T10:00:00+09:00" "2026-05-08T10:45:30+09:00"

Output:
  合計時間: 約 45 分
"""


def usage() -> None:
    print(USAGE, file=sys.stderr, end="")


def parse_iso_datetime(value: str) -> datetime:
    """
    ISO 形式の日時を datetime に変換する。

    対応例:
      2026-05-08T10:00:00+09:00
      2026-05-08T01:00:00Z
    """
    normalized = value

    # Python のバージョン差を避けるため、Z を明示的に UTC offset へ変換する
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        print(f"Error: invalid ISO datetime: {value}", file=sys.stderr)
        sys.exit(1)


def main() -> int:
    if len(sys.argv) != 3:
        usage()
        return 1

    start_datetime = parse_iso_datetime(sys.argv[1])
    end_datetime = parse_iso_datetime(sys.argv[2])

    try:
        diff_seconds = int((end_datetime - start_datetime).total_seconds())
    except TypeError:
        print(
            "Error: cannot compare timezone-aware and timezone-naive datetimes.",
            file=sys.stderr,
        )
        return 1

    if diff_seconds < 0:
        print("Error: end datetime is earlier than start datetime.", file=sys.stderr)
        return 1

    minutes = diff_seconds // 60

    print(f"合計時間: 約 {minutes} 分")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
