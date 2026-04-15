'use client';

import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import BlueprintBar from './BlueprintBar';

const HIDDEN_ROUTE_PREFIXES = ['/login', '/signup', '/upgrade', '/blueprint'];

export default function BlueprintBarWrapper({ children }) {
  const pathname = usePathname() || '';
  const { isSignedIn } = useAuth();
  const shouldShow =
    Boolean(isSignedIn) && !HIDDEN_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <>
      <div style={{ paddingBottom: shouldShow ? 60 : 0 }}>{children}</div>
      {shouldShow && <BlueprintBar />}
    </>
  );
}
