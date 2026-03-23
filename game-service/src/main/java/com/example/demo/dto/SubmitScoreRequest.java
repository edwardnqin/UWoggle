package com.example.demo.dto;

import java.util.List;

public class SubmitScoreRequest {
    private Integer finalScore;
    private List<String> foundWords;
    private String playerRole; // HOST or GUEST

    public SubmitScoreRequest() {
    }

    public Integer getFinalScore() { return finalScore; }
    public void setFinalScore(Integer finalScore) { this.finalScore = finalScore; }

    public List<String> getFoundWords() { return foundWords; }
    public void setFoundWords(List<String> foundWords) { this.foundWords = foundWords; }

    public String getPlayerRole() { return playerRole; }
    public void setPlayerRole(String playerRole) { this.playerRole = playerRole; }
}