import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

if (!getApps().length) {
  try {
    // Lightsail injects JSON at deployment; Compose and Kubernetes retain the file.
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ??
        readFileSync(resolve(process.cwd(), "serviceAccountKey.json"), "utf8"),
    );

    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("🔥 Firebase Admin inicializado correctamente.");
  } catch (error) {
    console.error("Error al inicializar Firebase Admin:", error);
    throw error;
  }
}

export const db = getFirestore();
export const auth = getAuth();
