package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "games")
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // We'll store the board as a comma-separated string for simplicity
    @Column(nullable = false)
    private String boardLayout;

    @Column(nullable = false)
    private Integer maxScore;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public GameSession() {}

    public GameSession(String boardLayout, Integer maxScore) {
        this.boardLayout = boardLayout;
        this.maxScore = maxScore;
        this.createdAt = LocalDateTime.now();
    }

    // Getters
    public Long getId() { return id; }
    public String getBoardLayout() { return boardLayout; }
    public Integer getMaxScore() { return maxScore; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    
    // Setters (if needed)
    public void setBoardLayout(String boardLayout) { this.boardLayout = boardLayout; }
    public void setMaxScore(Integer maxScore) { this.maxScore = maxScore; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}