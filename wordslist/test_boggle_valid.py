#!/usr/bin/env python3
"""
Basic tests for boggle_valid.txt.
Verifies expected words are present and invalid words are excluded.
"""

import unittest
from pathlib import Path

BOGGLE_VALID = Path(__file__).parent / "boggle_valid.txt"


def load_words() -> set[str]:
    """Load boggle_valid.txt into a set (lowercase)."""
    with open(BOGGLE_VALID, encoding="utf-8") as f:
        return {line.strip().lower() for line in f if line.strip()}


class TestBoggleValid(unittest.TestCase):
    """Tests for boggle_valid.txt content."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.words = load_words()

    def test_should_be_included(self) -> None:
        """3+ letter, letters-only words from TWL06 should be in the list."""
        expected = ["cat", "dog", "aardvark", "boggle", "quiz", "apple"]
        for word in expected:
            with self.subTest(word=word):
                self.assertIn(word, self.words, f"{word!r} should be in boggle_valid.txt")

    def test_should_not_be_included_two_letters(self) -> None:
        """2-letter words (valid in Scrabble) should be excluded for Boggle."""
        excluded = ["aa", "it", "ab", "qi"]
        for word in excluded:
            with self.subTest(word=word):
                self.assertNotIn(word, self.words, f"{word!r} should not be in boggle_valid.txt")

    def test_should_not_be_included_non_alpha(self) -> None:
        """Words with numbers or special chars should be excluded."""
        excluded = ["a1", "cat's", "re-elect", "x-ray"]
        for word in excluded:
            with self.subTest(word=word):
                self.assertNotIn(word, self.words, f"{word!r} should not be in boggle_valid.txt")

    def test_all_words_meet_boggle_rules(self) -> None:
        """Every word in the list should be 3+ letters and letters-only."""
        for word in self.words:
            with self.subTest(word=word):
                self.assertGreaterEqual(len(word), 3, f"{word!r} has < 3 letters")
                self.assertTrue(word.isalpha(), f"{word!r} contains non-alpha chars")


if __name__ == "__main__":
    unittest.main()
