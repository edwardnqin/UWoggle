# Research Report

## Boggle Word Search Algorithm

## Summary of Work

I researched different approaches to implement the Boggle word search algorithm. I compared a basic DFS (Depth-First Search) approach with a Trie + DFS optimization to determine which would be more efficient for validating and generating words on a 4x4 board.

## Motivation

Our Boggle game requires validating user-submitted words and possibly generating all valid words on a board. Since the number of possible letter paths grows quickly, I wanted to understand which algorithm would scale better.

## Results

### Approach 1: Basic DFS + dictionary set lookup

- Simple to implement
- May explore many unnecessary paths

### Approach 2: Trie + DFS

- Allows prefix pruning
- Stops exploring invalid prefixes early
- More efficient for large dictionaries

## Key Finding

Trie + DFS significantly reduces search space compared to naive DFS.

## Recommendation

For Sprint 1, basic DFS is sufficient for validation.  
For future automated solver features, Trie + DFS is recommended.

## Time Spent

~125 minutes

## Sources

[1] Boggle (Find all possible words in a board of characters) | Set 1
https://www.geeksforgeeks.org/boggle-find-possible-words-board-characters/

[2] Trie Data Structure
https://www.geeksforgeeks.org/trie-insert-and-search/

[3] Depth First Search or DFS for a Graph
https://www.geeksforgeeks.org/depth-first-search-or-dfs-for-a-graph/

[4] Princeton Algorithms, Boggle  
https://blog.csdn.net/jxtxzzw/article/details/109849541

[5] Solving Boggle Using Depth First Searches and Prefix Trees
https://medium.com/@ashalabi13/solving-boggle-using-depth-first-searches-and-prefix-trees-9c3faa89ea99

