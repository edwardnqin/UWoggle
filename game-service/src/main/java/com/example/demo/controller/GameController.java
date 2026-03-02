package com.example.demo.controller;

import com.example.demo.dto.SubmitScoreRequest;
import com.example.demo.service.GameSessionService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GameSessionService gameSessionService;

    public GameController(GameSessionService gameSessionService) {
        this.gameSessionService = gameSessionService;
    }

    @PostMapping
    public Map<String, Object> createGame() {
        return gameSessionService.createGame();
    }

    @PostMapping("/{id}/score")
    public Map<String, Object> submitScore(
            @PathVariable Long id,
            @RequestBody SubmitScoreRequest request
    ) {
        return gameSessionService.submitScore(id, request);
    }
}