import { useEffect, useState } from 'react';

export default function AuthButton() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return null;
  }

  if (user) {
    return (
      <a
        href="/admin"
        title={`Logged in as @${user.username}`}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 bg-white px-2.5 py-1 font-mono text-xs text-black transition-colors hover:bg-gray-50 focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-gray-200 dark:hover:bg-[#303030]"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
        admin
      </a>
    );
  }

  return (
    <a
      href="/login"
      className="cursor-pointer rounded border border-gray-300 bg-white px-2.5 py-1 font-mono text-xs text-black transition-colors hover:bg-gray-50 focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-gray-200 dark:hover:bg-[#303030]"
    >
      login
    </a>
  );
}
