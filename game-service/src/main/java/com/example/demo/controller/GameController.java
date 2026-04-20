package com.example.demo.controller;

import com.example.demo.dto.CreateGameRequest;
import com.example.demo.dto.ProgressUpdateRequest;
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
    public Map<String, Object> createGame(@RequestBody CreateGameRequest request) {
        return gameSessionService.createGame(request);
    }

    @PostMapping("/join/{joinCode}")
    public Map<String, Object> joinGame(
            @PathVariable String joinCode,
            @RequestParam(required = false) String guestName
    ) {
        return gameSessionService.joinGame(joinCode, guestName);
    }

    @GetMapping("/{id}")
    public Map<String, Object> getGame(@PathVariable Long id) {
        return gameSessionService.getGame(id);
    }

    @PostMapping("/{id}/progress")
    public Map<String, Object> updateProgress(
            @PathVariable Long id,
            @RequestBody ProgressUpdateRequest request
    ) {
        return gameSessionService.updateProgress(id, request);
    }

    @PostMapping("/{id}/score")
    public Map<String, Object> submitScore(
            @PathVariable Long id,
            @RequestBody SubmitScoreRequest request
    ) {
        return gameSessionService.submitScore(id, request);
    }
}