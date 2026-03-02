package com.example.demo.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.random.RandomGenerator;

/**
 * Generates randomized 4x4 Boggle boards using the standard 16-die letter distribution.
 * Returns a 2D char array for the frontend to populate the board.
 */
@Service
public class BoardGenerationService {

    private static final char[][] DICE = {
            {'A', 'A', 'E', 'E', 'G', 'N'},
            {'A', 'B', 'B', 'J', 'O', 'O'},
            {'A', 'C', 'H', 'O', 'P', 'S'},
            {'A', 'F', 'F', 'K', 'P', 'S'},
            {'A', 'O', 'O', 'T', 'T', 'W'},
            {'C', 'I', 'M', 'O', 'T', 'U'},
            {'D', 'E', 'I', 'L', 'R', 'X'},
            {'D', 'E', 'L', 'R', 'V', 'Y'},
            {'D', 'I', 'S', 'T', 'T', 'Y'},
            {'E', 'E', 'G', 'H', 'N', 'W'},
            {'E', 'E', 'I', 'N', 'S', 'U'},
            {'E', 'H', 'R', 'T', 'V', 'W'},
            {'E', 'I', 'O', 'S', 'S', 'T'},
            {'E', 'L', 'R', 'T', 'T', 'Y'},
            {'H', 'I', 'M', 'N', 'U', 'Q'},  // Qu face
            {'H', 'L', 'N', 'N', 'R', 'Z'},
    };

    private final RandomGenerator random = RandomGenerator.getDefault();

    /**
     * Generates a new 4x4 board. Shuffles die positions, then picks a random face per die.
     * @return char[4][4] — rows then columns, for frontend to render
     */
    public char[][] generate() {
        List<Integer> diceOrder = new ArrayList<>();
        for (int i = 0; i < 16; i++) diceOrder.add(i);
        Collections.shuffle(diceOrder, new Random(random.nextLong()));

        char[][] board = new char[4][4];
        for (int i = 0; i < 16; i++) {
            int dieIndex = diceOrder.get(i);
            char[] faces = DICE[dieIndex];
            board[i / 4][i % 4] = faces[random.nextInt(faces.length)];
        }
        return board;
    }
}
