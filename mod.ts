import { walk } from "https://deno.land/std@0.221.0/fs/mod.ts"
import { dirname, join, resolve } from "https://deno.land/std@0.221.0/path/mod.ts"

export type Options = {
    dryrun: boolean
    verbose: boolean
}

export const defaultOptions: Options = {
    dryrun: false,
    verbose: false,
}

const _info = (verbose: boolean) => (...message: string[]) => {
    if (!verbose) return
    console.info("INFO:", ...message)
}

const _log = () => (...message: string[]) => {
    console.info("INFO:", ...message)
}

type Plan = {
    from: string,
    to: string,
}

export const nfd_killer = async (path: string, options: Partial<Options>) => {
    const { dryrun, verbose } = { ...defaultOptions, ...options }

    const info = _info(verbose)
    const log = _log()

    const plan_dirs: Plan[] = []
    const queue_dirs: Promise<void>[] = []
    const queue_files: Promise<void>[] = []

    for await (const item of walk(resolve(path))) {

        // Skip already NFC
        if (item.name === item.name.normalize("NFC")) {
            info(`NFC - ${item.path}`)
            continue
        }

        // Check unicode normalization forms
        if (item.name === item.name.normalize("NFD")) {
            log(`NFD - ${item.path}`)
        } else if (item.name === item.name.normalize("NFKC")) {
            log(`NFKC - ${item.path}`)
        } else if (item.name === item.name.normalize("NFKD")) {
            log(`NFKD - ${item.path}`)
        } else {
            log(`UNKNOWN - ${item.path}`)
            continue // Skip unknown
        }

        // Create plan
        const plan = {
            from: join(dirname(item.path), item.name),
            to: join(dirname(item.path), item.name.normalize("NFC")),
        }

        // Defer directory processing
        if (item.isDirectory) {
            log(`DIR - ${item.path}`)
            plan_dirs.push(plan)
            continue
        }

        // Execute plan
        if (dryrun) {
            console.log(`${plan.from} => ${plan.to}`)
        } else {
            queue_files.push(
                Deno.rename(plan.from, plan.to)
            )
        }
    }

    // Wait processing files
    info("Wait for complete...")
    await Promise.all(queue_files)
    info("DONE - Files")

    for (const plan of plan_dirs) {
        // Execute plan
        if (dryrun) {
            console.log(`${plan.from} => ${plan.to}`)
        } else {
            queue_dirs.push(
                Deno.rename(plan.from, plan.to)
            )
        }
    }

    // Wait processing files
    info("Wait for complete...")
    await Promise.all(queue_dirs)
    info("DONE - Dirs")
}
