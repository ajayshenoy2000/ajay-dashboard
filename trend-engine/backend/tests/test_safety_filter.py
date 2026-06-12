from backend.processors.safety_filter import is_allowed_topic, rejection_reasons


def test_rejects_celebrity_speculation() -> None:
    reasons = rejection_reasons("有名人が整形してる疑惑で炎上")

    assert reasons
    assert not is_allowed_topic("有名人が整形してる疑惑で炎上")


def test_keeps_consultation_relevant_topic() -> None:
    assert is_allowed_topic("クマ取りのダウンタイムと内出血リスクを医師が解説")
