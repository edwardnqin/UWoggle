# Research Report

## Boggle Word List

### Summary of Work

I researched valid Boggle word rules and how to get a downloadable word list. I tried full dictionaries (removing proper nouns was too hard) and several Scrabble list sources before finding a usable one. I learned Boggle requires 3+ letters while Scrabble allows 2+, so I wrote a filter script to produce `boggle_valid.txt` from `TWL06.txt`.

### Motivation

Our Boggle game needs a dictionary for valid words. I needed to find a downloadable list and apply the right filters since Boggle and Scrabble have different rules.

### Time Spent

~45 minutes total

### Results

- **Source:** [TWL06.txt](https://norvig.com/ngrams/TWL06.txt) - Tournament Word List, 178,690 words
- **Output:** `boggle_valid.txt` (178,590 words) via `filter_boggle.py`
- **Rules applied:** 3+ letters, letters only, lowercase, no duplicates
- **Key finding:** Boggle and Scrabble differ. Scrabble allows 2-letter words; Boggle requires at least 3 [^1][^2]

### Sources

- [^1] [Boggle rules](https://en.wikipedia.org/wiki/Boggle)
- [^2] [Scrabble rules](https://www.scrabblepages.com/scrabble/rules/)
- [^3] [NASPA Word List](https://en.wikipedia.org/wiki/NASPA_Word_List)
- [^4] [TWL06.txt](https://norvig.com/ngrams/TWL06.txt)
- [^5] [Scribd Scrabble list](https://www.scribd.com/doc/243602543/OFFICIAL-Scrabble-Words) - failed to use
- [^6] [Scrabble Merriam-Webster](https://scrabble.merriam.com/) - failed to use
