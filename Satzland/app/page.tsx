import { redirect } from 'next/navigation';
import { getUser } from './auth';
import { chatGPTSignInPath } from './chatgpt-auth';
import SchreibiApp from './components/SchreibiApp';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getUser();
  if (user) return <SchreibiApp owner={user.userId}/>;
  if (import.meta.env.DEV) redirect(chatGPTSignInPath('/'));
  // Behind Cloudflare Access this only appears when the sign-in expired or the site is misconfigured.
  // The link must be a full page load so Access can show its sign-in page.
  // eslint-disable-next-line @next/next/no-img-element, @next/next/no-html-link-for-pages
  return <main className="signed-out"><img src="/icon-192.png" alt="" width={120}/><h1>LRS-Trainer</h1><p>Bitte melde dich mit der E-Mail-Adresse an, die für dich freigeschaltet wurde.</p><a className="button primary" href="/">Anmelden</a></main>;
}
