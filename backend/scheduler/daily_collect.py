from __future__ import annotations

from backend.api.service import collect_and_rank_trends


def main() -> None:
    trends = collect_and_rank_trends(use_live_sources=True)
    print(f"Collected and ranked {len(trends)} trends")


if __name__ == "__main__":
    main()
