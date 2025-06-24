"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthRedirector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, userProfile } = useAuth();

  useEffect(() => {
    const redirectPath = searchParams.get('redirect');
    if (redirectPath && isAuthenticated && userProfile) {
      router.push(redirectPath);
    }
  }, [searchParams, isAuthenticated, userProfile]);

  return null;
}
