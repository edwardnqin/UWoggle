package com.example.demo.service;

import com.example.demo.dictionary.DictionaryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class BoggleSolverTest {

    private BoggleSolver solver;

    @BeforeEach
    void setUp() {
        DictionaryService dictionary = new DictionaryService();
        dictionary.load();
        solver = new BoggleSolver(dictionary);
    }

    @Test
    void solveReturnsWordsAndScores() {
        // Board with CAT in row 0: C-A-T
        char[][] board = {
            {'C', 'A', 'T', 'E'},
            {'X', 'X', 'X', 'X'},
            {'X', 'X', 'X', 'X'},
            {'X', 'X', 'X', 'X'}
        };
        Map<String, Integer> words = solver.solve(board);
        assertTrue(words.containsKey("cat"));
        assertEquals(1, words.get("cat"));
    }

    @Test
    void maxScoreSumsAllScores() {
        Map<String, Integer> words = Map.of("cat", 1, "dog", 1, "forest", 3);
        assertEquals(5, BoggleSolver.maxScore(words));
    }
}
