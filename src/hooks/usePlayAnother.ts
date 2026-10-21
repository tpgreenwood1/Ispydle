import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/toastContext";
import { failureMessage, fetchRandom } from "../lib/api";
import { playedPuzzleNos } from "../lib/storage";

/** Navigates to a random puzzle this device hasn't seen (the server ignores the list once all are played). */
export function usePlayAnother() {
  const navigate = useNavigate();
  const toast = useToast();
  return useCallback(async () => {
    try {
      const puzzle = await fetchRandom(playedPuzzleNos());
      navigate(`/p/${puzzle.puzzleNo}`);
    } catch (err) {
      toast(failureMessage(err));
    }
  }, [navigate, toast]);
}
