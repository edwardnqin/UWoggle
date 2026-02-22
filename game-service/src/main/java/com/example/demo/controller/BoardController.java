package com.example.demo.controller;

import com.example.demo.service.BoardGenerationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/board")
public class BoardController {

    private final BoardGenerationService boardService;

    public BoardController(BoardGenerationService boardService) {
        this.boardService = boardService;
    }

    @GetMapping
    public Map<String, List<List<String>>> getBoard() {
        char[][] raw = boardService.generate();
        List<List<String>> board = new ArrayList<>();
        for (char[] row : raw) {
            List<String> cells = new ArrayList<>();
            for (char c : row) {
                cells.add(c == 'Q' ? "Qu" : String.valueOf(c));
            }
            board.add(cells);
        }
        return Map.of("board", board);
    }
}
