from pathlib import Path

import pytest

from app.services.file_parser import parse_file


def test_parse_docx():
    fixture = Path(__file__).parent / "fixtures" / "english.docx"
    text = parse_file(str(fixture))
    assert text
    assert len(text) > 0


def test_parse_pptx():
    fixture = Path(__file__).parent / "fixtures" / "sample.pptx"
    text = parse_file(str(fixture))
    assert "Test Presentation" in text
    assert "Chapter 1" in text


def test_parse_txt():
    fixture = Path(__file__).parent / "fixtures" / "sample.txt"
    text = parse_file(str(fixture))
    assert "sample text file" in text
    assert "Lorem ipsum" in text


def test_parse_unsupported():
    with pytest.raises(ValueError, match="Unsupported file type"):
        parse_file("test.xyz")
