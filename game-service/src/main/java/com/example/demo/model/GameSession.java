package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "games")
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "board_layout", nullable = false)
    private String boardLayout;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

    @Column(name = "final_score")
    private Integer finalScore;

    @Column(name = "found_words", columnDefinition = "TEXT")
    private String foundWords;

    @Column(nullable = false)
    private Boolean completed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public GameSession() {
    }

    public GameSession(String boardLayout, Integer maxScore) {
        this.boardLayout = boardLayout;
        this.maxScore = maxScore;
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (completed == null) {
            completed = false;
        }
    }

    public Long getId() {
        return id;
    }

    public String getBoardLayout() {
        return boardLayout;
    }

    public void setBoardLayout(String boardLayout) {
        this.boardLayout = boardLayout;
    }

    public Integer getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(Integer maxScore) {
        this.maxScore = maxScore;
    }

    public Integer getFinalScore() {
        return finalScore;
    }

    public void setFinalScore(Integer finalScore) {
        this.finalScore = finalScore;
    }

    public String getFoundWords() {
        return foundWords;
    }

    public void setFoundWords(String foundWords) {
        this.foundWords = foundWords;
    }

    public Boolean getCompleted() {
        return completed;
    }

    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}