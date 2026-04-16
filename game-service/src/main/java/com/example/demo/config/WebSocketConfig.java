package com.example.demo.config;

import com.example.demo.websocket.GameSessionWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final GameSessionWebSocketHandler gameSessionWebSocketHandler;

    public WebSocketConfig(GameSessionWebSocketHandler gameSessionWebSocketHandler) {
        this.gameSessionWebSocketHandler = gameSessionWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(gameSessionWebSocketHandler, "/ws/games")
                .setAllowedOrigins("http://localhost:5173");
    }
}