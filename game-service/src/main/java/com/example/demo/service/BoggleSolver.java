package com.example.demo.service;

import com.example.demo.dictionary.DictionaryService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Finds all valid Boggle words on a 4x4 board using DFS + Trie prefix pruning.
 */
@Service
public class BoggleSolver {

    private static final int[] DR = {-1, -1, -1, 0, 0, 1, 1, 1};
    private static final int[] DC = {-1, 0, 1, -1, 1, -1, 0, 1};

    private final DictionaryService dictionary;

    public BoggleSolver(DictionaryService dictionary) {
        this.dictionary = dictionary;
    }

    /**
     * Solves the board and returns word -> score. 3-4 letters = 1, 5 = 2, 6 = 3, 7 = 5, 8+ = 11.
     */
    public Map<String, Integer> solve(char[][] board) {
        Set<String> words = new HashSet<>();
        boolean[][] visited = new boolean[4][4];

        for (int r = 0; r < 4; r++) {
            for (int c = 0; c < 4; c++) {
                dfs(board, r, c, "", visited, words);
            }
        }

        Map<String, Integer> result = new HashMap<>();
        for (String word : words) {
            result.put(word, score(word));
        }
        return result;
    }

    private void dfs(char[][] board, int r, int c, String word, boolean[][] visited, Set<String> words) {
        if (r < 0 || r >= 4 || c < 0 || c >= 4 || visited[r][c]) return;

        String cell = board[r][c] == 'Q' ? "qu" : String.valueOf(Character.toLowerCase(board[r][c]));
        String newWord = word + cell;

        if (!dictionary.isPrefix(newWord)) return;

        if (newWord.length() >= 3 && dictionary.containsWord(newWord)) {
            words.add(newWord);
        }

        visited[r][c] = true;
        for (int i = 0; i < 8; i++) {
            dfs(board, r + DR[i], c + DC[i], newWord, visited, words);
        }
        visited[r][c] = false;
    }

    private static int score(String word) {
        int len = word.length();
        if (len <= 4) return 1;
        if (len == 5) return 2;
        if (len == 6) return 3;
        if (len == 7) return 5;
        return 11;
    }

    public static int maxScore(Map<String, Integer> words) {
        return words.values().stream().mapToInt(Integer::intValue).sum();
    }
}
