package com.example.demo.dictionary;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * Loads boggle_valid.txt into a Trie on startup for fast prefix/word lookups.
 */
@Service
public class DictionaryService {

    private static final Logger log = LoggerFactory.getLogger(DictionaryService.class);
    private static final String DICTIONARY_PATH = "dictionary/boggle_valid.txt";

    private final Trie trie = new Trie();

    @PostConstruct
    public void load() {
        try (var in = new ClassPathResource(DICTIONARY_PATH).getInputStream();
             var reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String line;
            int count = 0;
            while ((line = reader.readLine()) != null) {
                String word = line.strip().toLowerCase();
                if (!word.isEmpty()) {
                    trie.insert(word);
                    count++;
                }
            }
            log.info("Loaded {} words into dictionary Trie", count);
        } catch (Exception e) {
            log.error("Failed to load dictionary from {}", DICTIONARY_PATH, e);
            throw new IllegalStateException("Dictionary load failed", e);
        }
    }

    public boolean containsWord(String word) {
        return trie.containsWord(word);
    }

    public boolean isPrefix(String prefix) {
        return trie.isPrefix(prefix);
    }
}

