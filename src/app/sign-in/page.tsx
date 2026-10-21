import { redirect } from 'next/navigation';

/** Marketing alias — authentication remains on `/login`. */
export default function SignInAliasPage() {
  redirect('/login');
}
