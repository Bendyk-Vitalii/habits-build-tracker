export interface SavedFlashcard {
  id?: string;
  /** Term / word (front of card) */
  front: string;
  /** Definition / translation (back of card) */
  back: string;
  /** Topic name this card originated from */
  topicName: string;
  /** ISO timestamp when the card was saved */
  savedAt: string;
}
