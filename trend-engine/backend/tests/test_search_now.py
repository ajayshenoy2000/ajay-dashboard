from fastapi.testclient import TestClient

from backend.main import app


def test_search_now_respects_source_and_time_payload() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/search-now",
        json={
            "sources": ["x", "google_news"],
            "timeWindow": "12h",
            "analysisModelProvider": "gpt",
            "briefModelProvider": "claude",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["timeWindow"] == "12h"
    assert payload["meta"]["sources"] == ["x", "google_news"]
    assert payload["meta"]["briefModelProvider"] == "claude"
