import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { fetchSubjectDriveFiles, type DriveFileGroup } from "@/lib/drive-sync/client";

function FileLink({ id, name, webViewLink }: { id: string; name: string; webViewLink: string }) {
  return (
    <a
      key={id}
      href={webViewLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
    >
      <FileTextIcon className="size-4 shrink-0 text-neutral-400" />
      <span className="truncate group-hover:underline">{name}</span>
      <ExternalLinkIcon className="ml-auto size-3.5 shrink-0 text-neutral-300 group-hover:text-neutral-400" />
    </a>
  );
}

function FileGroup({ group }: { group: DriveFileGroup }) {
  return (
    <div className="flex flex-col">
      {group.folderName ? (
        <h3 className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">{group.folderName}</h3>
      ) : null}
      <div className="flex flex-col">
        {group.files.map((file) => (
          <FileLink key={file.id} {...file} />
        ))}
      </div>
    </div>
  );
}

export async function SubjectDriveFiles({ subject }: { subject: string }) {
  const groups = await fetchSubjectDriveFiles(subject);
  if (!groups || groups.every((g) => g.files.length === 0)) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="px-2 text-sm font-semibold text-neutral-900">Files in Drive</h2>
      <p className="px-2 pb-2 text-xs text-neutral-500">Opens directly in Google Drive in a new tab.</p>
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <FileGroup key={group.folderName ?? "_root"} group={group} />
        ))}
      </div>
    </div>
  );
}

export function SubjectDriveFilesSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="px-2 text-sm font-semibold text-neutral-900">Files in Drive</h2>
      <div className="mt-2 flex flex-col gap-2 px-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-5 w-2/3 animate-pulse rounded bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}
