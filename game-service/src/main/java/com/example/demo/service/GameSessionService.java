package com.example.demo.service;

import com.example.demo.dto.CreateGameRequest;
import com.example.demo.dto.SubmitScoreRequest;
import com.example.demo.model.GameSession;
import com.example.demo.repository.GameRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class GameSessionService {

    private final BoardGenerationService boardGenerationService;
    private final BoggleSolver boggleSolver;
    private final GameRepository gameRepository;

    public GameSessionService(
            BoardGenerationService boardGenerationService,
            BoggleSolver boggleSolver,
            GameRepository gameRepository
    ) {
        this.boardGenerationService = boardGenerationService;
        this.boggleSolver = boggleSolver;
        this.gameRepository = gameRepository;
    }

    public Map<String, Object> createGame(CreateGameRequest request) {
        char[][] raw = boardGenerationService.generate();

        List<List<String>> board = toFrontendBoard(raw);
        Map<String, Integer> words = boggleSolver.solve(raw);
        int maxScore = BoggleSolver.maxScore(words);

        GameSession gameSession = new GameSession();
        gameSession.setBoardLayout(serializeBoard(raw));
        gameSession.setMaxScore(maxScore);
        gameSession.setMode(request.getMode() == null ? "singleplayer" : request.getMode());
        gameSession.setTimerSeconds(request.getTimerSeconds() == null ? 180 : request.getTimerSeconds());
        gameSession.setHostUserId(request.getHostUserId());

        if ("multiplayer".equalsIgnoreCase(gameSession.getMode())) {
            gameSession.setStatus("WAITING");
            gameSession.setJoinCode(generateJoinCode());
        } else {
            gameSession.setStatus("ACTIVE");
            gameSession.setUserId(request.getHostUserId());
        }

        GameSession saved = gameRepository.save(gameSession);

        Map<String, Object> response = new HashMap<>();
        response.put("gameId", saved.getId());
        response.put("board", board);
        response.put("words", words);
        response.put("maxScore", maxScore);
        response.put("mode", saved.getMode());
        response.put("timerSeconds", saved.getTimerSeconds());
        response.put("status", saved.getStatus());
        response.put("joinCode", saved.getJoinCode());

        return response;
    }

    public Map<String, Object> joinGame(String joinCode, Long guestUserId) {
        GameSession gameSession = gameRepository.findByJoinCode(joinCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        if (!"multiplayer".equalsIgnoreCase(gameSession.getMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This is not a multiplayer game");
        }

        if (gameSession.getGuestUserId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game already has a second player");
        }

        gameSession.setGuestUserId(guestUserId);
        gameSession.setStatus("ACTIVE");

        GameSession saved = gameRepository.save(gameSession);

        return Map.of(
                "gameId", saved.getId(),
                "joinCode", saved.getJoinCode(),
                "status", saved.getStatus(),
                "mode", saved.getMode(),
                "timerSeconds", saved.getTimerSeconds(),
                "message", "Joined successfully"
        );
    }

    public Map<String, Object> submitScore(Long gameId, SubmitScoreRequest request) {
        if (request.getFinalScore() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "finalScore is required");
        }

        if (request.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required");
        }

        GameSession gameSession = gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        String foundWordsSerialized = serializeFoundWords(request.getFoundWords());

        // Single-player fallback
        if (!"multiplayer".equalsIgnoreCase(gameSession.getMode())) {
            if (Boolean.TRUE.equals(gameSession.getCompleted())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game already completed");
            }

            gameSession.setFinalScore(request.getFinalScore());
            gameSession.setFoundWords(foundWordsSerialized);
            gameSession.setCompleted(true);
            gameSession.setCompletedAt(LocalDateTime.now());

            GameSession updated = gameRepository.save(gameSession);

            return Map.of(
                    "gameId", updated.getId(),
                    "finalScore", updated.getFinalScore(),
                    "foundWords", request.getFoundWords() == null ? List.of() : request.getFoundWords(),
                    "completed", updated.getCompleted()
            );
        }

        // Multiplayer 1v1
        Long submittedUserId = request.getUserId();

        if (submittedUserId.equals(gameSession.getHostUserId())) {
            if (gameSession.getHostScore() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host score already submitted");
            }
            gameSession.setHostScore(request.getFinalScore());
            gameSession.setHostFoundWords(foundWordsSerialized);
        } else if (submittedUserId.equals(gameSession.getGuestUserId())) {
            if (gameSession.getGuestScore() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest score already submitted");
            }
            gameSession.setGuestScore(request.getFinalScore());
            gameSession.setGuestFoundWords(foundWordsSerialized);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not part of this game");
        }

        // If both players submitted, determine winner
        if (gameSession.getHostScore() != null && gameSession.getGuestScore() != null) {
            if (gameSession.getHostScore() > gameSession.getGuestScore()) {
                gameSession.setWinnerUserId(gameSession.getHostUserId());
            } else if (gameSession.getGuestScore() > gameSession.getHostScore()) {
                gameSession.setWinnerUserId(gameSession.getGuestUserId());
            } else {
                gameSession.setWinnerUserId(null); // tie
            }

            gameSession.setCompleted(true);
            gameSession.setCompletedAt(LocalDateTime.now());
            gameSession.setStatus("FINISHED");
        }

        GameSession updated = gameRepository.save(gameSession);

        Map<String, Object> response = new HashMap<>();
        response.put("gameId", updated.getId());
        response.put("mode", updated.getMode());
        response.put("hostScore", updated.getHostScore());
        response.put("guestScore", updated.getGuestScore());
        response.put("completed", updated.getCompleted());
        response.put("winnerUserId", updated.getWinnerUserId());
        response.put("message", "Score submitted successfully");

        return response;
    }

    public Map<String, Object> getGame(Long gameId) {
        GameSession gameSession = gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("gameId", gameSession.getId());
        response.put("mode", gameSession.getMode());
        response.put("status", gameSession.getStatus());
        response.put("timerSeconds", gameSession.getTimerSeconds());
        response.put("joinCode", gameSession.getJoinCode());
        response.put("hostUserId", gameSession.getHostUserId());
        response.put("guestUserId", gameSession.getGuestUserId());
        response.put("boardLayout", gameSession.getBoardLayout());
        response.put("maxScore", gameSession.getMaxScore());
        response.put("hostScore", gameSession.getHostScore());
        response.put("guestScore", gameSession.getGuestScore());
        response.put("winnerUserId", gameSession.getWinnerUserId());
        response.put("completed", gameSession.getCompleted());

        return response;
    }

    private String generateJoinCode() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private List<List<String>> toFrontendBoard(char[][] raw) {
        List<List<String>> board = new ArrayList<>();

        for (char[] row : raw) {
            List<String> cells = new ArrayList<>();
            for (char c : row) {
                cells.add(c == 'Q' ? "Qu" : String.valueOf(c));
            }
            board.add(cells);
        }

        return board;
    }

    private String serializeFoundWords(List<String> foundWords) {
        if (foundWords == null || foundWords.isEmpty()) return "";
        return String.join(",", foundWords);
    }

    private String serializeBoard(char[][] raw) {
        StringBuilder sb = new StringBuilder();

        for (int r = 0; r < raw.length; r++) {
            for (int c = 0; c < raw[r].length; c++) {
                sb.append(raw[r][c]);
                if (c < raw[r].length - 1) sb.append(",");
            }
            if (r < raw.length - 1) sb.append("|");
        }

        return sb.toString();
    }
}