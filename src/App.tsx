import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db } from './firebase';
import { Welcome } from './components/Welcome';
import { Dashboard } from './components/Dashboard';
import { Layers, AlertCircle } from 'lucide-react';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Quick development preview: allow auto-login when visiting with ?dev=1
    if (typeof window !== 'undefined' && window.location.search.includes('dev=1')) {
      const mockUser = {
        uid: 'dev-user-1',
        email: 'dev@example.com',
        displayName: 'Dev User',
        photoURL: ''
      } as unknown as User;
      setUser(mockUser);
      setInitializing(false);
      return;
    }
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Store user data in firestore collection "user" using email as document ID
          const userDocRef = doc(db, "user", currentUser.email || currentUser.uid);
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            name: currentUser.displayName || "",
            email: currentUser.email || "",
            phone: currentUser.phoneNumber || "",
            image_url: currentUser.photoURL || "",
            lastLogin: new Date().toISOString(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error: any) {
          console.error("Error storing user details in Firestore:", error);
          setErrorMsg("Firestore sync failed. Please ensure Firestore is created in your Firebase Console and Security Rules allow writes (Rules should allow read/write for authenticated users).");
        }
      }
      setUser(currentUser);
      setInitializing(false);
    }, (error) => {
      console.error("Auth state listener error:", error);
      setErrorMsg("Authentication service unavailable. Please check internet connection.");
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);


  if (initializing) {
    return (
      <div className="auth-loader-screen">
        <div className="glow-orb orb-1"></div>
        <div className="loader-container">
          <Layers className="loader-logo text-indigo-400 animate-pulse" />
          <div className="spinner"></div>
          <p>Setting up your productivity workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {errorMsg && (
        <div className="app-alert error">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {user ? (
        <Dashboard user={user} />
      ) : (
        <Welcome 
          onSignInStart={() => setErrorMsg("")}
          onSignInSuccess={(u) => setUser(u)}
          onSignInError={(err) => setErrorMsg(err)}
        />
      )}
    </div>
  );
}

export default App;
