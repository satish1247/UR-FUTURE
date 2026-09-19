// Seeds 10 SAMPLE jobs (fictional companies). Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed
import { upsertJob } from "@/lib/jobs/repo";
import { validateJobInput } from "@/lib/jobs/validate";
import { SAMPLE_JOBS } from "@/lib/seed/sample-jobs";

async function main() {
  for (const input of SAMPLE_JOBS) {
    const checked = validateJobInput(input);
    if (!checked.ok) throw new Error(`${input.title}: ${checked.errors.join("; ")}`);
    const { result } = await upsertJob(checked.job, new Date(), { isSample: true });
    console.log(`${result}: ${input.title}`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
