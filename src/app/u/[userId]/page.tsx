import { permanentRedirect } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * /u was a second profile route. The two were merged into /specialists, which
 * now resolves for any account rather than only an established one. This stays
 * as a redirect so links already shared keep working.
 */
export default async function LegacyProfilePage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await props.params;
  permanentRedirect(`/specialists/${userId}`);
}
