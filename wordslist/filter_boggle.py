#!/usr/bin/env python3
"""
Filter a word list for Boggle validity.
Rules: 3+ letters, letters only, lowercase, no duplicates.
"""

INPUT_FILE = "TWL06.txt"
OUTPUT_FILE = "boggle_valid.txt"
MIN_LENGTH = 3


def is_boggle_valid(word: str) -> bool:
    """Check if a word meets Boggle dictionary criteria."""
    word = word.strip().lower()
    if len(word) < MIN_LENGTH:
        return False
    if not word.isalpha():
        return False
    return True


def main():
    seen = set()
    valid = []

    with open(INPUT_FILE, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            word = line.strip().lower()
            if is_boggle_valid(word) and word not in seen:
                seen.add(word)
                valid.append(word)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(sorted(valid)))

    print(f"Filtered {len(valid)} Boggle-valid words -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
