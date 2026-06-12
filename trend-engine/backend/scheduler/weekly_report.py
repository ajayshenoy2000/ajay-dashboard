from __future__ import annotations

from pathlib import Path

from backend.api.service import get_record_this_week


ROOT_DIR = Path(__file__).resolve().parents[2]


def main() -> None:
    trends = get_record_this_week()
    lines = ["# Weekly L'or Clinic Trend Report", ""]
    for index, trend in enumerate(trends, start=1):
        lines.extend(
            [
                f"## {index}. {trend.title}",
                f"- Score: {trend.score.total}",
                f"- Keyword: {trend.keyword}",
                f"- Why it matters: {trend.why_it_matters}",
                "",
            ]
        )
    output = ROOT_DIR / "outputs" / "weekly_report.md"
    output.parent.mkdir(exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
