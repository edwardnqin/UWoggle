package com.example.demo.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "games")
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String mode;

    @Column(nullable = false)
    private String status;

    @Column(name = "timer_seconds", nullable = false)
    private Integer timerSeconds;

    @Column(name = "join_code", unique = true)
    private String joinCode;

    @Column(name = "host_name")
    private String hostName;

    @Column(name = "guest_name")
    private String guestName;

    @Column(name = "board_layout", nullable = false)
    private String boardLayout;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

    @Column(name = "host_score")
    private Integer hostScore;

    @Column(name = "guest_score")
    private Integer guestScore;

    @Column(name = "host_found_words", columnDefinition = "TEXT")
    private String hostFoundWords;

    @Column(name = "guest_found_words", columnDefinition = "TEXT")
    private String guestFoundWords;

    @Column(name = "host_submitted", nullable = false)
    private Boolean hostSubmitted;

    @Column(name = "guest_submitted", nullable = false)
    private Boolean guestSubmitted;

    @Column(name = "winner_slot")
    private String winnerSlot;

    @Column(nullable = false)
    private Boolean completed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public GameSession() {
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (completed == null) completed = false;
        if (hostSubmitted == null) hostSubmitted = false;
        if (guestSubmitted == null) guestSubmitted = false;
        if (mode == null) mode = "singleplayer";
        if (status == null) status = "WAITING";
        if (timerSeconds == null) timerSeconds = 180;
    }

    public Long getId() {
        return id;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getTimerSeconds() {
        return timerSeconds;
    }

    public void setTimerSeconds(Integer timerSeconds) {
        this.timerSeconds = timerSeconds;
    }

    public String getJoinCode() {
        return joinCode;
    }

    public void setJoinCode(String joinCode) {
        this.joinCode = joinCode;
    }

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
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

    public Integer getHostScore() {
        return hostScore;
    }

    public void setHostScore(Integer hostScore) {
        this.hostScore = hostScore;
    }

    public Integer getGuestScore() {
        return guestScore;
    }

    public void setGuestScore(Integer guestScore) {
        this.guestScore = guestScore;
    }

    public String getHostFoundWords() {
        return hostFoundWords;
    }

    public void setHostFoundWords(String hostFoundWords) {
        this.hostFoundWords = hostFoundWords;
    }

    public String getGuestFoundWords() {
        return guestFoundWords;
    }

    public void setGuestFoundWords(String guestFoundWords) {
        this.guestFoundWords = guestFoundWords;
    }

    public Boolean getHostSubmitted() {
        return hostSubmitted;
    }

    public void setHostSubmitted(Boolean hostSubmitted) {
        this.hostSubmitted = hostSubmitted;
    }

    public Boolean getGuestSubmitted() {
        return guestSubmitted;
    }

    public void setGuestSubmitted(Boolean guestSubmitted) {
        this.guestSubmitted = guestSubmitted;
    }

    public String getWinnerSlot() {
        return winnerSlot;
    }

    public void setWinnerSlot(String winnerSlot) {
        this.winnerSlot = winnerSlot;
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

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}