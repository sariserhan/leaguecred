import { sqlClient } from "@/db";
import { seedExpandedLeagueCatalog } from "@/db/expanded-catalog";

async function main() {
  try {
    await sqlClient.begin((sql) => seedExpandedLeagueCatalog(sql));
    console.info("Top-flight league catalog is ready.");
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
