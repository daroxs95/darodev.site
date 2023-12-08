---
title: "Load firebase and forget"
description: "How to load firebase without fear"
pubDate: "April 04 2023"
keywords: "firebase, typescript"
#heroImage: "/firebase-hero.png"
draft: false
---

I know that you have only one firebase app in your project and is weird how you initialize it, so this way no amount of messy code can cause multiple loads :
```typescript
import {initializeApp, cert, getApps} from 'firebase-admin/app';

const existentApps = getApps();

export const firebaseAdminAppInstance =
  existentApps?.[0] ||
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_APPLICATION_CREDENTIALS || '{}')),
  });

export default firebaseAdminAppInstance;
```

⚠️ The example is using `firebase-admin` because in web client should work ok no matter what.
