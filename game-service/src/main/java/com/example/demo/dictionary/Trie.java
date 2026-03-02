package com.example.demo.dictionary;

import java.util.HashMap;
import java.util.Map;

/**
 * Trie for fast prefix and word lookups during Boggle solving.
 */
public class Trie {

    private final TrieNode root = new TrieNode();

    public void insert(String word) {
        if (word == null || word.isEmpty()) return;
        String lower = word.toLowerCase();
        TrieNode node = root;
        for (char c : lower.toCharArray()) {
            node = node.children.computeIfAbsent(c, k -> new TrieNode());
        }
        node.isEndOfWord = true;
    }

    public boolean containsWord(String word) {
        TrieNode node = findNode(word);
        return node != null && node.isEndOfWord;
    }

    public boolean isPrefix(String prefix) {
        return findNode(prefix) != null;
    }

    private TrieNode findNode(String s) {
        if (s == null || s.isEmpty()) return root;
        TrieNode node = root;
        for (char c : s.toLowerCase().toCharArray()) {
            node = node.children.get(c);
            if (node == null) return null;
        }
        return node;
    }

    private static class TrieNode {
        final Map<Character, TrieNode> children = new HashMap<>();
        boolean isEndOfWord;
    }
}

