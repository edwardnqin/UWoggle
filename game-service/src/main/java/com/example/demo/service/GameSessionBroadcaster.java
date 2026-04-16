package com.example.demo.service;

import com.example.demo.websocket.GameSessionWebSocketHandler;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class GameSessionBroadcaster {

    private final GameSessionWebSocketHandler webSocketHandler;
    private final ObjectMapper objectMapper;

    public GameSessionBroadcaster(
            GameSessionWebSocketHandler webSocketHandler,
            ObjectMapper objectMapper
    ) {
        this.webSocketHandler = webSocketHandler;
        this.objectMapper = objectMapper;
    }

    public void broadcastGameState(Long gameId, Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            webSocketHandler.broadcastToGame(gameId, json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize WebSocket payload", e);
        }
    }
}