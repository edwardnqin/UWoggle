package com.example.demo.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameSessionWebSocketHandler extends TextWebSocketHandler {

    private final Map<Long, Set<WebSocketSession>> sessionsByGame = new ConcurrentHashMap<>();
    private final Map<String, Long> gameIdBySessionId = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long gameId = extractGameId(session.getUri());

        if (gameId == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        sessionsByGame.computeIfAbsent(gameId, key -> ConcurrentHashMap.newKeySet()).add(session);
        gameIdBySessionId.put(session.getId(), gameId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        removeSession(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        removeSession(session);
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    public void broadcastToGame(Long gameId, String payload) {
        Set<WebSocketSession> sessions = sessionsByGame.get(gameId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        TextMessage message = new TextMessage(payload);

        sessions.removeIf(session -> !session.isOpen());

        for (WebSocketSession session : sessions) {
            try {
                session.sendMessage(message);
            } catch (IOException ignored) {
                removeSession(session);
            }
        }
    }

    private void removeSession(WebSocketSession session) {
        Long gameId = gameIdBySessionId.remove(session.getId());
        if (gameId == null) {
            return;
        }

        Set<WebSocketSession> sessions = sessionsByGame.get(gameId);
        if (sessions == null) {
            return;
        }

        sessions.remove(session);

        if (sessions.isEmpty()) {
            sessionsByGame.remove(gameId);
        }
    }

    private Long extractGameId(URI uri) {
        if (uri == null) {
            return null;
        }

        String raw = UriComponentsBuilder.fromUri(uri)
                .build()
                .getQueryParams()
                .getFirst("gameId");

        if (raw == null || raw.isBlank()) {
            return null;
        }

        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}