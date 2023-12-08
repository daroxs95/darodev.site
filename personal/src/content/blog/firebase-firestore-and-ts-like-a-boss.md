---
title: "Firestore and Typescript like a Boss"
description: "Opinionated firestore and typescript setup aiding types for communication"
pubDate: "April 04 2023"
keywords: "firestore, firebase, typescript"
#heroImage: "/firebase-hero.png"
---

Starting web development and getting to know the web ecosystem could be a really cumbersome and tiring task. Then you start hearing about firebase and firestore as a "backend" solution and people advertising themselves and using firebase as a valuable skill (and it really is). So you went down that road, and if like me, there is always the hate of avoidable runtime errors, you overuse typescript. So here is a really basic and opinionated config to use firestore(web version 9, modular) and typescript with low boilerplate code levels and "strongly" typing the objects and communication with "backend", thanks [withConverter](https://firebase.google.com/docs/reference/js/firestore_.firestoredataconverter).

Assuming the firebase app is already up and running, we can start:
```typescript
// firebaseApp/firebase.ts
// Basic config file and firebase utils
import {initializeApp} from 'firebase/app';
import {getFirestore} from 'firebase/firestore';

const firebaseConfig = {
  // Not all are needed
  apiKey: FIREBASE_PUBLIC_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

export const firebaseAppInstance = initializeApp(firebaseConfig);

export function getFirestoreInstance() {
  return getFirestore(firebaseAppInstance);
}
```

Now for abstraction (there is a core function missing here but bear with me):
```typescript
// firebaseApp/db.ts
// For almost all comunication we will be using the shorthand collections from here
import {typedCollection} from 'firebaseApp/converters';

export interface UserData {
  subscribedToNewsletter: boolean;
}

const db = {
  users: {
    usersData: typedCollection<UserData>('usersData'),
  },
};

export {db};
```

Now the juicy handlers:
```typescript
// firebaseApp/converters.ts
// This are the heavy lifting utilities
import { QueryDocumentSnapshot, DocumentData, collection } from "firebase/firestore";
import { getFirestoreInstance } from "./firebase";

const firestoreInstance = getFirestoreInstance();

/** 
 * Generic converter
 * 
 * @returns typed `FirestoreDataConverter` object
 */
export const genConverter = <T>() => ({
  toFirestore: (data: T) => data as DocumentData,
  fromFirestore: (snap: QueryDocumentSnapshot) =>
    snap.data() as T
})

/**
 * Abstracts paths to a collection reference
 * and chains a data converter based on template param
 *
 * @param collectionPath Path to collection in firestore
 * @returns Typed firestore `CollectionReference`
 */
export const typedCollection = <T>(collectionPath: string) =>
  collection(firestoreInstance, collectionPath).withConverter(genConverter<T>());
```

The previous code is self explanatory can be easily (and it really needs to) extended, and as an example usage, ta-daa! ... more abstractions:

```typescript
// firebaseApp/users/usersData.ts
// This are some abstractions to 
import {User} from 'firebase/auth';
import {doc, getDoc, deleteDoc, setDoc} from 'firebase/firestore';
import {db, UserData} from 'firebaseApp/db';

export async function getUserData(user?: User | null) {
  if (!user) return undefined;
  const docRef = doc(db.users.usersData, user.uid);
  const docSnap = getDoc(docRef)
    .then(res => res.data())
    .catch(() => undefined);
  return docSnap;
}

export async function updateUserData(user: User | null, data: UserData | null) {
  if (!user) return false;
  const docRef = doc(db.users.usersData, user.uid);
  if (!data) {
    await setDoc(docRef, data);
    return true;
  }
  await deleteDoc(docRef);
  return false;
}


```
⚠️ A important note is this implementation does not play well with `firebase-admin` lib and even less if client an server libs ar mixed.

 So now all operations using the abstracted `db` will be typed and nice to use everywhere. Happy coding folks, and Godspeed.😁

