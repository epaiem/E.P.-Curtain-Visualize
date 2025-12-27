
import { db, storage } from './firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * สำคัญมาก! ต้องตั้งค่ากฎ (Rules) ทั้ง 2 ส่วนดังนี้:
 * 
 * 1. FIRESTORE RULES (ไปที่เมนู Firestore Database > Rules):
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /curtain_designs/{designId} {
 *       allow read, delete: if request.auth != null && resource.data.userId == request.auth.uid;
 *       allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
 *       allow update: if request.auth != null && resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid;
 *     }
 *   }
 * }
 * 
 * 2. STORAGE RULES (ไปที่เมนู Storage > Rules):
 * rules_version = '2';
 * service firebase.storage {
 *   match /b/{bucket}/o {
 *     match /designs/{userId}/{allPaths=**} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *   }
 * }
 */

export interface DesignRecord {
  id?: string;
  userId: string;
  originalImageUrl: string;
  generatedImageUrl: string;
  styleName: string;
  curtainName: string;
  colorName: string;
  layerName: string;
  createdAt: any;
}

export async function saveDesign(
  userId: string,
  originalBase64: string,
  generatedBase64: string,
  details: { style: string; curtain: string; color: string; layer: string }
) {
  try {
    const timestamp = Date.now();
    
    // 1. Upload Images to Storage
    const originalRef = ref(storage, `designs/${userId}/${timestamp}_orig.jpg`);
    const generatedRef = ref(storage, `designs/${userId}/${timestamp}_gen.jpg`);

    console.log("Uploading images to storage...");
    await uploadString(originalRef, originalBase64, 'data_url');
    await uploadString(generatedRef, generatedBase64, 'data_url');

    const originalUrl = await getDownloadURL(originalRef);
    const generatedUrl = await getDownloadURL(generatedRef);

    // 2. Save Metadata to Firestore
    console.log("Saving metadata to firestore...");
    const docRef = await addDoc(collection(db, "curtain_designs"), {
      userId,
      originalImageUrl: originalUrl,
      generatedImageUrl: generatedUrl,
      styleName: details.style,
      curtainName: details.curtain,
      colorName: details.color,
      layerName: details.layer,
      createdAt: Timestamp.now()
    });

    return docRef.id;
  } catch (error: any) {
    console.error("Full Save Error Object:", error);
    if (error.code === 'storage/unauthorized' || error.code === 'permission-denied' || error.message?.includes('permission')) {
      throw new Error("PERMISSION_DENIED");
    }
    throw error;
  }
}

export async function getUserDesigns(userId: string): Promise<DesignRecord[]> {
  try {
    // FIX: Remove 'orderBy' to avoid the requirement for a composite index (userId + createdAt).
    // This allows the history to load immediately without manual index creation in Firebase Console.
    const q = query(
      collection(db, "curtain_designs"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DesignRecord));

    // Perform sorting in memory: descending order (newest first)
    results.sort((a, b) => {
      const getMillis = (obj: any) => {
        if (!obj) return 0;
        if (typeof obj.toMillis === 'function') return obj.toMillis();
        if (obj.seconds) return obj.seconds * 1000;
        if (obj instanceof Date) return obj.getTime();
        return Number(obj) || 0;
      };
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });

    return results;
  } catch (error: any) {
    console.error("Full Fetch Error Object:", error);
    
    // Check for Permission Denied
    if (error.code === 'permission-denied' || error.message?.toLowerCase().includes('permission')) {
      throw new Error("PERMISSION_DENIED");
    }
    
    // Check for Index Required (should be rare now as we sort in memory)
    if (error.message && error.message.includes('index')) {
      const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
      const indexUrl = urlMatch ? urlMatch[0] : null;
      
      const err = new Error("INDEX_REQUIRED") as any;
      err.indexUrl = indexUrl;
      throw err;
    }

    throw error;
  }
}
