package com.example.demo.dto;

import java.util.List;

public class SubmitScoreRequest {

    private Integer finalScore;
    private List<String> foundWords;
    private Long userId;

    public SubmitScoreRequest() {
    }

    public Integer getFinalScore() {
        return finalScore;
    }

    public void setFinalScore(Integer finalScore) {
        this.finalScore = finalScore;
    }

    public List<String> getFoundWords() {
        return foundWords;
    }

    public void setFoundWords(List<String> foundWords) {
        this.foundWords = foundWords;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}