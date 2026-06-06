import {
  Firestore,
  collection,
  doc,
  CollectionReference,
  DocumentReference,
} from '@angular/fire/firestore';

/**
 * Returns a Firestore CollectionReference scoped to the current user.
 *
 * Path: `users/{uid}/{collectionName}`
 */
export function userCollection(
  firestore: Firestore,
  uid: string,
  collectionName: string,
): CollectionReference {
  return collection(firestore, `users/${uid}/${collectionName}`);
}

/**
 * Returns a Firestore DocumentReference scoped to the current user.
 *
 * Path: `users/{uid}/{collectionName}/{docId}`
 */
export function userDoc(
  firestore: Firestore,
  uid: string,
  collectionName: string,
  docId: string,
): DocumentReference {
  return doc(firestore, `users/${uid}/${collectionName}`, docId);
}
