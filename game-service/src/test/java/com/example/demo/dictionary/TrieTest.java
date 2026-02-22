package com.example.demo.dictionary;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TrieTest {

    @Test
    void insertAndContainsWord() {
        Trie trie = new Trie();
        trie.insert("cat");
        trie.insert("dog");
        assertTrue(trie.containsWord("cat"));
        assertTrue(trie.containsWord("dog"));
        assertFalse(trie.containsWord("ca"));
        assertFalse(trie.containsWord("cats"));
    }

    @Test
    void isPrefix() {
        Trie trie = new Trie();
        trie.insert("cat");
        assertTrue(trie.isPrefix("c"));
        assertTrue(trie.isPrefix("ca"));
        assertTrue(trie.isPrefix("cat"));
        assertFalse(trie.isPrefix("d"));
        assertFalse(trie.isPrefix("catx"));
    }
}
