
"use client";

import { AuthProvider } from './AuthContext';
import { useSearchParams } from 'next/navigation';

export default function AuthContextWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  return (
    <AuthProvider redirectUrl={redirectUrl}>
      {children}
    </AuthProvider>
  );
}
