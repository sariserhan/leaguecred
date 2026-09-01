import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";
import {
  applyTeamMerge,
  loadDedupeTeams,
  loadFixtureEvidence,
  loadStubEvidence,
  selfPlayingFixtures,
} from "@/services/team-dedupe-plan";
import { planTeamMerges } from "@/services/team-dedupe";

/**
 * Merges clubs that were catalogued twice.
 *
 * Team identity is keyed on (provider, provider_external_id), so the same club
 * arriving from a second provider became a second row — most visibly when a
 * continental competition was synced and its participants had no membership in
 * it yet. `synchronizeFixtures` no longer creates those, and this repairs the
 * rows already stored.
 *
 * Two clubs may legitimately share a name, so a merge needs more than matching
 * names: the rows must also share a region. Liverpool of Montevideo plays in
 * the Americas and Liverpool of England in Europe, so they are left alone.
 *
 * Reports without writing unless --apply is passed. The same evidence and the
 * same merge are available in the admin panel, from
 * @/services/team-dedupe-plan.
 */

async function main() {
  const apply = process.argv.includes("--apply");
  const onlyArg = process.argv.find((argument) => argument.startsWith("--only="));
  const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

  console.info(`Target database: ${describeDatabaseTarget()}`);
  console.info(apply ? "Applying merges." : "Dry run. Pass --apply to write.");

  try {
    const evidence = await loadFixtureEvidence();
    for (const pair of evidence.rejected) {
      console.warn(`FIXTURES SUGGEST ${pair.nameA} and ${pair.nameB} are one club, but the names do not agree. Left alone.`);
    }
    for (const pair of await loadStubEvidence()) {
      console.warn(`SUSPECT ${pair.nameA} and ${pair.nameB} share a competition and one has never played. ` +
        `Check them; add an alias if they are one club.`);
    }
    const planned = planTeamMerges(await loadDedupeTeams(), evidence.accepted);
    const merges = only ? planned.merges.filter((merge) => [merge.canonical.slug, ...merge.duplicates.map((team) => team.slug)].some((slug) => only.has(slug))) : planned.merges;
    const unresolved = only ? [] : planned.unresolved;

    if (merges.length === 0) console.info("\nNo duplicate clubs to merge.");
    for (const merge of merges) {
      const blocked = await selfPlayingFixtures([merge.canonical.id, ...merge.duplicates.map((team) => team.id)]);
      const names = merge.duplicates.map((team) => `${team.slug} (${team.provider})`).join(", ");
      if (blocked > 0) {
        console.warn(`SKIP ${merge.canonical.name}: ${blocked} fixture(s) list both rows as opponents.`);
        continue;
      }
      console.info(`${apply ? "MERGE" : "WOULD MERGE"} ${names} -> ${merge.canonical.slug} (${merge.canonical.provider})`);
      if (apply) await applyTeamMerge(merge);
    }

    for (const group of unresolved) {
      console.info(`LEFT ALONE ${group[0].name}: ${group.map((team) => `${team.slug} [${team.regions.join("/") || "no league"}]`).join(", ")}`);
    }

    console.info(`\n${merges.length} club(s) to merge, ${unresolved.length} left for review.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
