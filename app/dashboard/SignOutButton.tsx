'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        window.location.href = '/';
      }}
      style={{ marginLeft: 16, background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', fontSize: 14 }}
    >
      Sign out
    </button>
  );
}
