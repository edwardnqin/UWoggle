package com.example.demo.service;

import com.example.demo.dto.CreateGameRequest;
import com.example.demo.dto.SubmitScoreRequest;
import com.example.demo.model.GameSession;
import com.example.demo.repository.GameRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

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
        gameSession.setHostName(
                request.getHostName() == null || request.getHostName().isBlank()
                        ? "Host"
                        : request.getHostName()
        );

        if ("multiplayer".equalsIgnoreCase(gameSession.getMode())) {
            gameSession.setStatus("WAITING");
            gameSession.setJoinCode(generateJoinCode());
        } else {
            gameSession.setStatus("ACTIVE");
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
        response.put("hostName", saved.getHostName());

        return response;
    }

    public Map<String, Object> joinGame(String joinCode, String guestName) {
        GameSession gameSession = gameRepository.findByJoinCode(joinCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        if (!"multiplayer".equalsIgnoreCase(gameSession.getMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This is not a multiplayer game");
        }

        if (gameSession.getGuestName() != null && !gameSession.getGuestName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game already has a second player");
        }

        gameSession.setGuestName(
                guestName == null || guestName.isBlank()
                        ? "Guest"
                        : guestName
        );
        gameSession.setStatus("ACTIVE");

        GameSession saved = gameRepository.save(gameSession);

        Map<String, Object> response = new HashMap<>();
        response.put("gameId", saved.getId());
        response.put("joinCode", saved.getJoinCode());
        response.put("status", saved.getStatus());
        response.put("mode", saved.getMode());
        response.put("timerSeconds", saved.getTimerSeconds());
        response.put("hostName", saved.getHostName());
        response.put("guestName", saved.getGuestName());
        response.put("message", "Joined successfully");

        return response;
    }

    public Map<String, Object> submitScore(Long gameId, SubmitScoreRequest request) {
        if (request.getFinalScore() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "finalScore is required");
        }

        if (request.getPlayerRole() == null || request.getPlayerRole().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "playerRole is required");
        }

        GameSession gameSession = gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        String foundWordsSerialized = serializeFoundWords(request.getFoundWords());
        String role = request.getPlayerRole().trim().toUpperCase(Locale.ROOT);

        if ("HOST".equals(role)) {
            if (gameSession.getHostScore() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host score already submitted");
            }
            gameSession.setHostScore(request.getFinalScore());
            gameSession.setHostFoundWords(foundWordsSerialized);
        } else if ("GUEST".equals(role)) {
            if (gameSession.getGuestScore() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest score already submitted");
            }
            gameSession.setGuestScore(request.getFinalScore());
            gameSession.setGuestFoundWords(foundWordsSerialized);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "playerRole must be HOST or GUEST");
        }

        if (gameSession.getHostScore() != null && gameSession.getGuestScore() != null) {
            if (gameSession.getHostScore() > gameSession.getGuestScore()) {
                gameSession.setWinnerSlot("HOST");
            } else if (gameSession.getGuestScore() > gameSession.getHostScore()) {
                gameSession.setWinnerSlot("GUEST");
            } else {
                gameSession.setWinnerSlot("TIE");
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
        response.put("winnerSlot", updated.getWinnerSlot());
        response.put("completed", updated.getCompleted());
        response.put("message", "Score submitted successfully");

        return response;
    }

    public Map<String, Object> getGame(Long gameId) {
        GameSession gameSession = gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        char[][] rawBoard = deserializeBoardToChars(gameSession.getBoardLayout());
        List<List<String>> board = toFrontendBoard(rawBoard);
        Map<String, Integer> words = boggleSolver.solve(rawBoard);

        Map<String, Object> response = new HashMap<>();
        response.put("gameId", gameSession.getId());
        response.put("mode", gameSession.getMode());
        response.put("status", gameSession.getStatus());
        response.put("timerSeconds", gameSession.getTimerSeconds());
        response.put("joinCode", gameSession.getJoinCode());
        response.put("hostName", gameSession.getHostName());
        response.put("guestName", gameSession.getGuestName());
        response.put("boardLayout", gameSession.getBoardLayout());
        response.put("board", board);
        response.put("words", words);
        response.put("maxScore", gameSession.getMaxScore());
        response.put("hostScore", gameSession.getHostScore());
        response.put("guestScore", gameSession.getGuestScore());
        response.put("winnerSlot", gameSession.getWinnerSlot());
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

    private char[][] deserializeBoardToChars(String boardLayout) {
        String[] rows = boardLayout.split("\\|");
        char[][] board = new char[rows.length][];

        for (int r = 0; r < rows.length; r++) {
            String[] cells = rows[r].split(",");
            board[r] = new char[cells.length];
            for (int c = 0; c < cells.length; c++) {
                board[r][c] = cells[c].charAt(0);
            }
        }

        return board;
    }

    private String serializeFoundWords(List<String> foundWords) {
        if (foundWords == null || foundWords.isEmpty()) {
            return "";
        }
        return String.join(",", foundWords);
    }

    private String serializeBoard(char[][] raw) {
        StringBuilder sb = new StringBuilder();

        for (int r = 0; r < raw.length; r++) {
            for (int c = 0; c < raw[r].length; c++) {
                sb.append(raw[r][c]);
                if (c < raw[r].length - 1) {
                    sb.append(",");
                }
            }
            if (r < raw.length - 1) {
                sb.append("|");
            }
        }

        return sb.toString();
    }
}