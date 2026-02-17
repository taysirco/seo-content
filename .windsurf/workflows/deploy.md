---
description: Deploy the SEO Content Writing System to Firebase App Hosting
---

# Firebase App Hosting Deployment

## Prerequisites
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Have a Firebase project created at https://console.firebase.google.com

## Setup (First time only)

// turbo
1. Update `.firebaserc` with your actual project ID:
```json
{
  "projects": {
    "default": "YOUR_ACTUAL_PROJECT_ID"
  }
}
```

2. Update `apphosting.yaml` with your actual Firebase config values (replace all `your-project` placeholders)

3. Set secrets in Firebase:
```bash
firebase apphosting:secrets:set gemini-api-key
firebase apphosting:secrets:set serper-api-key
firebase apphosting:secrets:set firebase-api-key
```

4. Deploy Firestore rules:
```bash
firebase deploy --only firestore:rules
```

## Deploy

// turbo
5. Build the project locally first to verify:
```bash
npm run build
```

6. Create the App Hosting backend (first time):
```bash
firebase apphosting:backends:create --project YOUR_PROJECT_ID
```

7. Deploy:
```bash
firebase apphosting:backends:deploy --project YOUR_PROJECT_ID
```

## Environment Variables Required
- `GEMINI_API_KEY` - Google AI Studio API key
- `SERPER_API_KEY` - Serper.dev API key  
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase Web API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - e.g. project.firebaseapp.com
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - e.g. project.appspot.com
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
