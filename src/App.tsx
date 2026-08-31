import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import DevLogin from './components/DevLogin';
import PlaceholderDashboard from './components/PlaceholderDashboard';

function MainContent() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <DevLogin />;
  }

  return <PlaceholderDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
