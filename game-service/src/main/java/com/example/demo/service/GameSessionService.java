package com.example.demo.service;

import com.example.demo.dto.CreateGameRequest;
import com.example.demo.dto.ProgressUpdateRequest;
import com.example.demo.dto.SubmitScoreRequest;
import com.example.demo.model.GameSession;
import com.example.demo.repository.GameRepository;
import com.example.demo.websocket.GameWebSocketHandler;
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
    private final GameWebSocketHandler gameWebSocketHandler;

    public GameSessionService(
            BoardGenerationService boardGenerationService,
            BoggleSolver boggleSolver,
            GameRepository gameRepository,
            GameWebSocketHandler gameWebSocketHandler
    ) {
        this.boardGenerationService = boardGenerationService;
        this.boggleSolver = boggleSolver;
        this.gameRepository = gameRepository;
        this.gameWebSocketHandler = gameWebSocketHandler;
    }

    public Map<String, Object> createGame(CreateGameRequest request) {
        char[][] raw = boardGenerationService.generate();
        Map<String, Integer> words = boggleSolver.solve(raw);
        int maxScore = BoggleSolver.maxScore(words);

        GameSession gameSession = new GameSession();
        gameSession.setBoardLayout(serializeBoard(raw));
        gameSession.setMaxScore(maxScore);
        gameSession.setMode(request.getMode() == null ? "singleplayer" : request.getMode().trim().toLowerCase(Locale.ROOT));
        gameSession.setTimerSeconds(request.getTimerSeconds() == null ? 180 : request.getTimerSeconds());
        gameSession.setHostName(
                request.getHostName() == null || request.getHostName().isBlank()
                        ? "Host"
                        : request.getHostName().trim()
        );
        gameSession.setHostScore(0);
        gameSession.setGuestScore(0);
        gameSession.setHostFoundWords("");
        gameSession.setGuestFoundWords("");
        gameSession.setHostSubmitted(false);
        gameSession.setGuestSubmitted(false);

        if ("multiplayer".equalsIgnoreCase(gameSession.getMode())) {
            gameSession.setStatus("WAITING");
            gameSession.setJoinCode(generateJoinCode());
            gameSession.setStartedAt(null);
        } else {
            gameSession.setStatus("ACTIVE");
            gameSession.setJoinCode(null);
            gameSession.setStartedAt(LocalDateTime.now());
        }

        GameSession saved = gameRepository.save(gameSession);
        return buildGameResponse(saved);
    }

    public Map<String, Object> joinGame(String joinCode, String guestName) {
        String normalizedJoinCode = joinCode == null ? "" : joinCode.trim().toUpperCase(Locale.ROOT);

        GameSession gameSession = gameRepository.findByJoinCode(normalizedJoinCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        if (!"multiplayer".equalsIgnoreCase(gameSession.getMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This is not a multiplayer game");
        }

        if (Boolean.TRUE.equals(gameSession.getCompleted()) || "FINISHED".equalsIgnoreCase(gameSession.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game already finished");
        }

        if (!"WAITING".equalsIgnoreCase(gameSession.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game is not available to join");
        }

        if (gameSession.getGuestName() != null && !gameSession.getGuestName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game already has a second player");
        }

        gameSession.setGuestName(
                guestName == null || guestName.isBlank()
                        ? "Guest"
                        : guestName.trim()
        );
        gameSession.setStatus("ACTIVE");
        gameSession.setStartedAt(LocalDateTime.now());

        GameSession saved = gameRepository.save(gameSession);
        Map<String, Object> response = buildGameResponse(saved);
        gameWebSocketHandler.broadcastGameUpdate(saved.getId(), response);
        return response;
    }

    public Map<String, Object> updateProgress(Long gameId, ProgressUpdateRequest request) {
        if (request.getPlayerRole() == null || request.getPlayerRole().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "playerRole is required");
        }

        GameSession gameSession = gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        if (Boolean.TRUE.equals(gameSession.getCompleted())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game already completed");
        }

        if (!"ACTIVE".equalsIgnoreCase(gameSession.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game is not active");
        }

        String role = request.getPlayerRole().trim().toUpperCase(Locale.ROOT);
        String serializedWords = serializeFoundWords(request.getFoundWords());

        if ("HOST".equals(role)) {
            if (Boolean.TRUE.equals(gameSession.getHostSubmitted())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host already submitted final score");
            }
            if (request.getCurrentScore() != null) {
                gameSession.setHostScore(request.getCurrentScore());
            }
            gameSession.setHostFoundWords(serializedWords);
        } else if ("GUEST".equals(role)) {
            if (gameSession.getGuestName() == null || gameSession.getGuestName().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest has not joined this game");
            }
            if (Boolean.TRUE.equals(gameSession.getGuestSubmitted())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest already submitted final score");
            }
            if (request.getCurrentScore() != null) {
                gameSession.setGuestScore(request.getCurrentScore());
            }
            gameSession.setGuestFoundWords(serializedWords);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "playerRole must be HOST or GUEST");
        }

        GameSession updated = gameRepository.save(gameSession);
        Map<String, Object> response = buildGameResponse(updated);
        gameWebSocketHandler.broadcastGameUpdate(updated.getId(), response);
        return response;
    }

    public Map<String, Object> submitScore(Long gameId, SubmitScoreRequest request) {
        if (request.getPlayerRole() == null || request.getPlayerRole().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "playerRole is required");
        }

        GameSession gameSession = gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        if (Boolean.TRUE.equals(gameSession.getCompleted())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game already completed");
        }

        String role = request.getPlayerRole().trim().toUpperCase(Locale.ROOT);
        String serializedWords = serializeFoundWords(request.getFoundWords());

        if ("HOST".equals(role)) {
            if (Boolean.TRUE.equals(gameSession.getHostSubmitted())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host score already submitted");
            }
            if (request.getFinalScore() != null) {
                gameSession.setHostScore(request.getFinalScore());
            }
            gameSession.setHostFoundWords(serializedWords);
            gameSession.setHostSubmitted(true);
        } else if ("GUEST".equals(role)) {
            if (!"multiplayer".equalsIgnoreCase(gameSession.getMode())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest cannot submit score in singleplayer");
            }
            if (gameSession.getGuestName() == null || gameSession.getGuestName().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest has not joined this game");
            }
            if (Boolean.TRUE.equals(gameSession.getGuestSubmitted())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest score already submitted");
            }
            if (request.getFinalScore() != null) {
                gameSession.setGuestScore(request.getFinalScore());
            }
            gameSession.setGuestFoundWords(serializedWords);
            gameSession.setGuestSubmitted(true);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "playerRole must be HOST or GUEST");
        }

        if ("singleplayer".equalsIgnoreCase(gameSession.getMode())) {
            gameSession.setWinnerSlot("HOST");
            gameSession.setCompleted(true);
            gameSession.setCompletedAt(LocalDateTime.now());
            gameSession.setStatus("FINISHED");
        } else if (Boolean.TRUE.equals(gameSession.getHostSubmitted()) && Boolean.TRUE.equals(gameSession.getGuestSubmitted())) {
            int host = gameSession.getHostScore() == null ? 0 : gameSession.getHostScore();
            int guest = gameSession.getGuestScore() == null ? 0 : gameSession.getGuestScore();

            if (host > guest) {
                gameSession.setWinnerSlot("HOST");
            } else if (guest > host) {
                gameSession.setWinnerSlot("GUEST");
            } else {
                gameSession.setWinnerSlot("TIE");
            }

            gameSession.setCompleted(true);
            gameSession.setCompletedAt(LocalDateTime.now());
            gameSession.setStatus("FINISHED");
        }

        GameSession updated = gameRepository.save(gameSession);
        Map<String, Object> response = buildGameResponse(updated);
        gameWebSocketHandler.broadcastGameUpdate(updated.getId(), response);
        return response;
    }

    public Map<String, Object> getGame(Long gameId) {
        GameSession gameSession = gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        return buildGameResponse(gameSession);
    }

    private Map<String, Object> buildGameResponse(GameSession gameSession) {
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
        response.put("totalWordCount", words.size());
        response.put("maxScore", gameSession.getMaxScore());
        response.put("hostScore", gameSession.getHostScore());
        response.put("guestScore", gameSession.getGuestScore());
        response.put("hostFoundWords", deserializeFoundWords(gameSession.getHostFoundWords()));
        response.put("guestFoundWords", deserializeFoundWords(gameSession.getGuestFoundWords()));
        response.put("hostSubmitted", gameSession.getHostSubmitted());
        response.put("guestSubmitted", gameSession.getGuestSubmitted());
        response.put("winnerSlot", gameSession.getWinnerSlot());
        response.put("completed", gameSession.getCompleted());
        response.put("createdAt", gameSession.getCreatedAt());
        response.put("startedAt", gameSession.getStartedAt());
        response.put("completedAt", gameSession.getCompletedAt());
        response.put("bothPlayersJoined", gameSession.getGuestName() != null && !gameSession.getGuestName().isBlank());

        return response;
    }

    private String generateJoinCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private List<List<String>> toFrontendBoard(char[][] raw) {
        List<List<String>> board = new ArrayList<>();

        for (char[] row : raw) {
            List<String> cells = new ArrayList<>();
            for (char c : row) {
                cells.add(c == 'Q' ? "QU" : String.valueOf(c));
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

    private List<String> deserializeFoundWords(String words) {
        if (words == null || words.isBlank()) {
            return List.of();
        }

        String[] arr = words.split(",");
        List<String> result = new ArrayList<>();
        for (String word : arr) {
            if (!word.isBlank()) {
                result.add(word.trim());
            }
        }
        return result;
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