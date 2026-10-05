/**
 * The one address the site answers on. leaguecred.com 308-redirects here, so
 * every absolute URL we publish — sitemap, robots, metadataBase, JSON-LD — uses
 * www. Listing the apex made every sitemap entry a redirect, and Google kept
 * the www page as canonical while leaving the listed one unindexed.
 */
export const SITE_URL = "https://www.leaguecred.com";
