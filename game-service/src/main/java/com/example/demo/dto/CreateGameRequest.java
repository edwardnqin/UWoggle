package com.example.demo.dto;

public class CreateGameRequest {
    private String mode;
    private Integer timerSeconds;
    private Long hostUserId;

    public CreateGameRequest() {
    }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public Integer getTimerSeconds() { return timerSeconds; }
    public void setTimerSeconds(Integer timerSeconds) { this.timerSeconds = timerSeconds; }

    public Long getHostUserId() { return hostUserId; }
    public void setHostUserId(Long hostUserId) { this.hostUserId = hostUserId; }
}