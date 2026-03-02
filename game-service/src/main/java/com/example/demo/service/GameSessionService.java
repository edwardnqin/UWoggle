package com.example.demo.service;

import com.example.demo.dto.SubmitScoreRequest;
import com.example.demo.model.GameSession;
import com.example.demo.repository.GameRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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

    public Map<String, Object> createGame() {
        char[][] raw = boardGenerationService.generate();

        List<List<String>> board = toFrontendBoard(raw);
        Map<String, Integer> words = boggleSolver.solve(raw);
        int maxScore = BoggleSolver.maxScore(words);

        String boardLayout = serializeBoard(raw);

        GameSession gameSession = new GameSession(boardLayout, maxScore);
        GameSession saved = gameRepository.save(gameSession);

        return Map.of(
                "gameId", saved.getId(),
                "board", board,
                "words", words,
                "maxScore", maxScore
        );
    }

    public Map<String, Object> submitScore(Long gameId, SubmitScoreRequest request) {
        if (request.getFinalScore() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "finalScore is required");
        }

        GameSession gameSession = gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));

        if (Boolean.TRUE.equals(gameSession.getCompleted())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Game already completed");
        }

        String foundWordsSerialized = serializeFoundWords(request.getFoundWords());

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

    private String serializeFoundWords(List<String> foundWords) {
        if (foundWords == null || foundWords.isEmpty()) {
            return "";
        }
        return String.join(",", foundWords);
    }
}