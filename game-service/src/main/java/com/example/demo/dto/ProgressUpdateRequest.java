package com.example.demo.dto;

import java.util.List;

public class ProgressUpdateRequest {
    private Integer currentScore;
    private List<String> foundWords;
    private String playerRole;

    public ProgressUpdateRequest() {
    }

    public Integer getCurrentScore() {
        return currentScore;
    }

    public void setCurrentScore(Integer currentScore) {
        this.currentScore = currentScore;
    }

    public List<String> getFoundWords() {
        return foundWords;
    }

    public void setFoundWords(List<String> foundWords) {
        this.foundWords = foundWords;
    }

    public String getPlayerRole() {
        return playerRole;
    }

    public void setPlayerRole(String playerRole) {
        this.playerRole = playerRole;
    }
}