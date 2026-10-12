import Image from "next/image";

/** Decorative mark: the surrounding link or wordmark provides the accessible name. */
export default function NexusMark() {
  return <Image src="/nexus-logo.png" width={28} height={28} alt="" unoptimized />;
}
