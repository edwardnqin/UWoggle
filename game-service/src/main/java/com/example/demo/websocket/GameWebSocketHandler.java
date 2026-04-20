package com.example.demo.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final Map<Long, Set<WebSocketSession>> sessionsByGameId = new ConcurrentHashMap<>();

    public GameWebSocketHandler() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("WS connected: " + session.getUri());

        Long gameId = extractGameId(session.getUri());
        System.out.println("Extracted gameId: " + gameId);

        if (gameId == null) {
            try {
                session.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
            return;
        }

        sessionsByGameId
                .computeIfAbsent(gameId, ignored -> ConcurrentHashMap.newKeySet())
                .add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        System.out.println("WS closed: " + session.getUri() + " status=" + status);
        removeSession(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        System.out.println("WS transport error: " + exception.getMessage());
        removeSession(session);
    }

    public void broadcastGameUpdate(Long gameId, Map<String, Object> payload) {
        Set<WebSocketSession> sessions = sessionsByGameId.get(gameId);
        if (sessions == null || sessions.isEmpty()) {
            System.out.println("No WS sessions for gameId=" + gameId);
            return;
        }

        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "type", "GAME_UPDATE",
                    "payload", payload
            ));

            System.out.println("Broadcasting WS update to gameId=" + gameId + " sessionCount=" + sessions.size());

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (Exception e) {
            System.out.println("WS broadcast failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void removeSession(WebSocketSession session) {
        Long gameId = extractGameId(session.getUri());
        if (gameId == null) {
            return;
        }

        Set<WebSocketSession> sessions = sessionsByGameId.get(gameId);
        if (sessions == null) {
            return;
        }

        sessions.remove(session);
        if (sessions.isEmpty()) {
            sessionsByGameId.remove(gameId);
        }
    }

    private Long extractGameId(URI uri) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }

        String[] params = uri.getQuery().split("&");
        for (String param : params) {
            String[] kv = param.split("=", 2);
            if (kv.length == 2 && "gameId".equals(kv[0])) {
                try {
                    return Long.parseLong(kv[1]);
                } catch (NumberFormatException e) {
                    return null;
                }
            }
        }

        return null;
    }
}