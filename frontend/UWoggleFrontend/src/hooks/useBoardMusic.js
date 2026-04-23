import { useCallback, useEffect, useRef } from "react";
import backgroundMusicUrl from "../assets/sounds/background-music.mp3";

function getBoardSignature(board) {
  if (!Array.isArray(board) || board.length === 0) return null;
  return board
    .map((row) => (Array.isArray(row) ? row.join(",") : ""))
    .join("|");
}

export default function useBoardMusic({ shouldKeepLooping = true } = {}) {
  const audioRef = useRef(null);
  const lastBoardSignatureRef = useRef(null);
  const shouldKeepLoopingRef = useRef(shouldKeepLooping);
  const pendingInteractionRetryRef = useRef(false);

  const stopMusic = useCallback(() => {
    pendingInteractionRetryRef.current = false;

    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.loop = false;
  }, []);

  const attemptPlay = useCallback((audio) => {
    if (!audio) return;

    const playPromise = audio.play();

    if (!playPromise || typeof playPromise.then !== "function") {
      pendingInteractionRetryRef.current = false;
      return;
    }

    playPromise
      .then(() => {
        pendingInteractionRetryRef.current = false;
      })
      .catch(() => {
        // Autoplay can be blocked until the user interacts with the page.
        pendingInteractionRetryRef.current = true;
      });
  }, []);

  useEffect(() => {
    const audio = new Audio(backgroundMusicUrl);
    audio.preload = "auto";

    const handleEnded = () => {
      if (!shouldKeepLoopingRef.current) {
        audio.loop = false;
        return;
      }

      audio.loop = true;
      audio.currentTime = 0;
      attemptPlay(audio);
    };

    const handleInteraction = () => {
      if (!pendingInteractionRetryRef.current || !audioRef.current) return;
      attemptPlay(audioRef.current);
    };

    audio.addEventListener("ended", handleEnded);
    window.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    audioRef.current = audio;

    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;

      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [attemptPlay]);

  useEffect(() => {
    shouldKeepLoopingRef.current = shouldKeepLooping;

    if (!shouldKeepLooping) {
      stopMusic();
    }
  }, [shouldKeepLooping, stopMusic]);

  const playForBoard = useCallback(
    (board) => {
      const nextSignature = getBoardSignature(board);

      if (!nextSignature || nextSignature === lastBoardSignatureRef.current) {
        return;
      }

      lastBoardSignatureRef.current = nextSignature;

      if (!audioRef.current) return;

      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      attemptPlay(audioRef.current);
    },
    [attemptPlay]
  );

  return { playForBoard, stopMusic };
}
