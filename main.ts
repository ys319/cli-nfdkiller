if (!import.meta.main) throw new Error("This is not library.")

import { nfd_killer } from "./mod.ts"

const args = [...Deno.args]
for (const item of args) {
  nfd_killer(item, { dryrun: true })
}
