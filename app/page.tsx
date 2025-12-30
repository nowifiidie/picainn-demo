import { redirect } from 'next/navigation';
import { routing } from '@/src/i18n/routing';

// This page only renders when the user visits `/`
// The middleware will redirect to the appropriate locale
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
