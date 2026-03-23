package com.example.demo.dto;

public class CreateGameRequest {
    private String mode;
    private Integer timerSeconds;
    private String hostName;

    public CreateGameRequest() {
    }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public Integer getTimerSeconds() { return timerSeconds; }
    public void setTimerSeconds(Integer timerSeconds) { this.timerSeconds = timerSeconds; }

    public String getHostName() { return hostName; }
    public void setHostName(String hostName) { this.hostName = hostName; }
}