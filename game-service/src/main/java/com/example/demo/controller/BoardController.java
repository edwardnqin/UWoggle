package com.example.demo.controller;

import com.example.demo.service.BoardGenerationService;
import com.example.demo.service.BoggleSolver;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/board")
public class BoardController {

    private final BoardGenerationService boardService;
    private final BoggleSolver solver;

    public BoardController(BoardGenerationService boardService, BoggleSolver solver) {
        this.boardService = boardService;
        this.solver = solver;
    }

    @GetMapping
    public Map<String, Object> getBoard() {
        char[][] raw = boardService.generate();
        List<List<String>> board = new ArrayList<>();
        for (char[] row : raw) {
            List<String> cells = new ArrayList<>();
            for (char c : row) {
                cells.add(c == 'Q' ? "QU" : String.valueOf(c));
            }
            board.add(cells);
        }

        Map<String, Integer> words = solver.solve(raw);
        int maxScore = BoggleSolver.maxScore(words);

        return Map.of(
                "board", board,
                "words", words,
                "maxScore", maxScore
        );
    }
}