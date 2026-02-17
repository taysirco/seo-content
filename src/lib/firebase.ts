import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { PipelineState } from '@/types/pipeline';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Analytics (client-side only — safely skipped on server)
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) getAnalytics(app);
  });
}

export { db };

// ─── Project CRUD ───

export interface ProjectSummary {
  id: string;
  keyword: string;
  city: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  // S1: SaaS multi-site fields
  clientName?: string;
  domain?: string;
  logoUrl?: string;
  tags?: string[];
  // W17-4: Publishing workflow
  publishStatus?: string;
}

export async function saveProject(state: PipelineState): Promise<void> {
  if (!state.projectId) return;

  const projectRef = doc(db, 'projects', state.projectId);
  const existing = await getDoc(projectRef);
  await setDoc(projectRef, {
    keyword: state.keyword,
    location: state.location,
    clientMeta: state.clientMeta || null,
    currentStep: state.currentStep,
    publishStatus: state.publishStatus || 'draft',
    updatedAt: serverTimestamp(),
    ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
  }, { merge: true });

  // Save all steps in parallel for speed
  const stepWrites = [];
  for (let i = 1; i <= 13; i++) {
    const stepKey = `step${i}` as keyof PipelineState;
    const stepData = state[stepKey];
    if (stepData) {
      const stepRef = doc(db, 'projects', state.projectId, 'steps', `step${i}`);
      stepWrites.push(setDoc(stepRef, { data: JSON.stringify(stepData) }));
    }
  }
  await Promise.all(stepWrites);
}

export async function loadProject(projectId: string): Promise<Partial<PipelineState> | null> {
  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) return null;

  const projectData = projectSnap.data();
  const state: Partial<PipelineState> = {
    projectId,
    keyword: projectData.keyword || '',
    location: projectData.location || null,
    clientMeta: projectData.clientMeta || null,
    currentStep: projectData.currentStep || 1,
    publishStatus: projectData.publishStatus || 'draft',
  };

  // Load all steps in parallel for speed
  const stepRefs = Array.from({ length: 13 }, (_, i) =>
    doc(db, 'projects', projectId, 'steps', `step${i + 1}`)
  );
  const stepSnaps = await Promise.all(stepRefs.map(ref => getDoc(ref)));
  stepSnaps.forEach((snap, i) => {
    if (snap.exists()) {
      const stepKey = `step${i + 1}` as keyof PipelineState;
      try {
        (state as Record<string, unknown>)[stepKey] = JSON.parse(snap.data().data);
      } catch {
        // Skip corrupted data
      }
    }
  });

  return state;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const projectsRef = collection(db, 'projects');
  const q = query(projectsRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      keyword: data.keyword || '',
      city: data.location?.city || data.location?.cityAr || data.location?.cityLocal || '',
      currentStep: data.currentStep || 1,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : new Date().toISOString(),
      // S1: SaaS fields
      clientName: data.clientMeta?.clientName || '',
      domain: data.clientMeta?.domain || '',
      logoUrl: data.clientMeta?.logoUrl || '',
      tags: data.clientMeta?.tags || [],
      // W17-4: Publishing workflow
      publishStatus: data.publishStatus || 'draft',
    };
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  // Delete step sub-docs in parallel for speed
  await Promise.all(
    Array.from({ length: 13 }, (_, i) =>
      deleteDoc(doc(db, 'projects', projectId, 'steps', `step${i + 1}`)).catch(() => {})
    )
  );
  // Delete project doc
  await deleteDoc(doc(db, 'projects', projectId));
}
