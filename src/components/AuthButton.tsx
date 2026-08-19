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
        className="text-xs font-mono px-2.5 py-1 bg-white hover:bg-gray-50 dark:bg-[#252525] dark:hover:bg-[#303030] text-black dark:text-gray-200 border border-gray-300 dark:border-[#444444] rounded cursor-pointer transition-colors inline-flex items-center gap-1.5 focus:outline-2 focus:outline-blue-500"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        admin
      </a>
    );
  }

  return (
    <a
      href="/login"
      className="text-xs font-mono px-2.5 py-1 bg-white hover:bg-gray-50 dark:bg-[#252525] dark:hover:bg-[#303030] text-black dark:text-gray-200 border border-gray-300 dark:border-[#444444] rounded cursor-pointer transition-colors focus:outline-2 focus:outline-blue-500"
    >
      login
    </a>
  );
}
