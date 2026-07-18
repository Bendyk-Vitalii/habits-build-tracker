import {
  Firestore,
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  DocumentData,
  QueryDocumentSnapshot,
} from '@angular/fire/firestore';

/**
 * Returns a typed Firestore CollectionReference scoped to the current user.
 *
 * Path: `users/{uid}/{collectionName}`
 */
export function userCollection<T extends DocumentData = DocumentData>(
  firestore: Firestore,
  uid: string,
  collectionName: string,
): CollectionReference<T> {
  return collection(firestore, `users/${uid}/${collectionName}`) as CollectionReference<T>;
}

/**
 * Returns a typed Firestore DocumentReference scoped to the current user.
 *
 * Path: `users/{uid}/{collectionName}/{docId}`
 */
export function userDoc<T extends DocumentData = DocumentData>(
  firestore: Firestore,
  uid: string,
  collectionName: string,
  docId: string,
): DocumentReference<T> {
  return doc(firestore, `users/${uid}/${collectionName}`, docId) as DocumentReference<T>;
}

/**
 * Extracts typed data from a Firestore document snapshot and attaches the
 * Firestore document ID as the `id` field.
 *
 * Eliminates the need for `({ ...d.data(), id: d.id }) as unknown as T`
 * throughout the codebase.
 */
export function docWithId<T extends DocumentData>(
  snap: QueryDocumentSnapshot<T>,
): T & { id: string } {
  return { ...snap.data(), id: snap.id };
}
