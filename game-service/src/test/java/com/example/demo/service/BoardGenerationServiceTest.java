package com.example.demo.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BoardGenerationServiceTest {

    @Test
    void generateReturns4x4() {
        BoardGenerationService service = new BoardGenerationService();
        char[][] board = service.generate();
        assertEquals(4, board.length);
        assertEquals(4, board[0].length);
    }

    @Test
    void generateUsesValidLetters() {
        BoardGenerationService service = new BoardGenerationService();
        char[][] board = service.generate();
        for (char[] row : board) {
            for (char c : row) {
                assertTrue(Character.isLetter(c), "Expected letter, got: " + c);
            }
        }
    }

    @Test
    void generateProducesDifferentBoards() {
        BoardGenerationService service = new BoardGenerationService();
        char[][] a = service.generate();
        char[][] b = service.generate();
        // Very unlikely to be identical across two calls
        boolean same = true;
        for (int i = 0; i < 4 && same; i++) {
            for (int j = 0; j < 4 && same; j++) {
                if (a[i][j] != b[i][j]) same = false;
            }
        }
        assertFalse(same, "Two generated boards should differ");
    }
}
