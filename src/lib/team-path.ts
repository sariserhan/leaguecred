const teamIdPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function teamSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "team";
}

export function teamHref(team: { slug: string }) {
  return `/teams/${team.slug}`;
}

export function teamIdFromPath(path: string) {
  return teamIdPattern.exec(path)?.[1] ?? null;
}
