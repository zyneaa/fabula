from app.services.chunker import chunk_text, estimate_tokens


def test_chunk_text_basic():
    text = " ".join(f"word{i}" for i in range(1000))
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    assert len(chunks) > 1
    assert all(len(c.split()) <= 500 for c in chunks)


def test_chunk_text_empty():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_chunk_text_small():
    text = "hello world"
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_overlap():
    words = [f"w{i}" for i in range(100)]
    text = " ".join(words)
    chunks = chunk_text(text, chunk_size=30, overlap=10)
    assert len(chunks) > 3
    first_words = chunks[0].split()
    second_words = chunks[1].split()
    assert first_words[-10:] == second_words[:10]


def test_estimate_tokens():
    assert estimate_tokens("hello world") == 2
    assert estimate_tokens("") == 0
    assert estimate_tokens("one") == 1
