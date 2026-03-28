package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "games")
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "host_user_id")
    private Long hostUserId;

    @Column(name = "guest_user_id")
    private Long guestUserId;

    @Column(nullable = false)
    private String mode;

    @Column(nullable = false)
    private String status;

    @Column(name = "timer_seconds", nullable = false)
    private Integer timerSeconds;

    @Column(name = "join_code", unique = true)
    private String joinCode;

    @Column(name = "board_layout", nullable = false)
    private String boardLayout;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

    // legacy single-player
    @Column(name = "final_score")
    private Integer finalScore;

    @Column(name = "found_words", columnDefinition = "TEXT")
    private String foundWords;

    // real multiplayer 1v1
    @Column(name = "host_score")
    private Integer hostScore;

    @Column(name = "guest_score")
    private Integer guestScore;

    @Column(name = "host_found_words", columnDefinition = "TEXT")
    private String hostFoundWords;

    @Column(name = "guest_found_words", columnDefinition = "TEXT")
    private String guestFoundWords;

    @Column(name = "winner_user_id")
    private Long winnerUserId;

    @Column(nullable = false)
    private Boolean completed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public GameSession() {
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (completed == null) completed = false;
        if (mode == null) mode = "singleplayer";
        if (status == null) status = "WAITING";
        if (timerSeconds == null) timerSeconds = 180;
    }

    public Long getId() { return id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getHostUserId() { return hostUserId; }
    public void setHostUserId(Long hostUserId) { this.hostUserId = hostUserId; }

    public Long getGuestUserId() { return guestUserId; }
    public void setGuestUserId(Long guestUserId) { this.guestUserId = guestUserId; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getTimerSeconds() { return timerSeconds; }
    public void setTimerSeconds(Integer timerSeconds) { this.timerSeconds = timerSeconds; }

    public String getJoinCode() { return joinCode; }
    public void setJoinCode(String joinCode) { this.joinCode = joinCode; }

    public String getBoardLayout() { return boardLayout; }
    public void setBoardLayout(String boardLayout) { this.boardLayout = boardLayout; }

    public Integer getMaxScore() { return maxScore; }
    public void setMaxScore(Integer maxScore) { this.maxScore = maxScore; }

    public Integer getFinalScore() { return finalScore; }
    public void setFinalScore(Integer finalScore) { this.finalScore = finalScore; }

    public String getFoundWords() { return foundWords; }
    public void setFoundWords(String foundWords) { this.foundWords = foundWords; }

    public Integer getHostScore() { return hostScore; }
    public void setHostScore(Integer hostScore) { this.hostScore = hostScore; }

    public Integer getGuestScore() { return guestScore; }
    public void setGuestScore(Integer guestScore) { this.guestScore = guestScore; }

    public String getHostFoundWords() { return hostFoundWords; }
    public void setHostFoundWords(String hostFoundWords) { this.hostFoundWords = hostFoundWords; }

    public String getGuestFoundWords() { return guestFoundWords; }
    public void setGuestFoundWords(String guestFoundWords) { this.guestFoundWords = guestFoundWords; }

    public Long getWinnerUserId() { return winnerUserId; }
    public void setWinnerUserId(Long winnerUserId) { this.winnerUserId = winnerUserId; }

    public Boolean getCompleted() { return completed; }
    public void setCompleted(Boolean completed) { this.completed = completed; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}