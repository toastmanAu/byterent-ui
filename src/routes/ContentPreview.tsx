import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';
import { ArrowLeftIcon, FileIcon, LightningIcon } from '../components/icons';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';

export function ContentPreview() {
  const { typeId } = useParams<{ typeId: string }>();
  const meta = useQuery({
    queryKey: ['ckbfs-meta', typeId],
    queryFn: () => indexer.getCkbfsMeta(typeId!),
    enabled: !!typeId,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-br-muted hover:text-br-fg"
      >
        <ArrowLeftIcon /> back
      </Link>

      {meta.isLoading && (
        <div className="mt-8">
          <Skeleton h="h-3" w="w-16" />
          <Skeleton className="mt-3" h="h-6" w="w-64" />
          <Skeleton className="mt-2" h="h-4" w="w-80" />
          <Skeleton className="mt-8" h="h-40" w="w-full" />
        </div>
      )}

      {meta.error && (
        <div className="mt-10">
          <EmptyState
            icon={<LightningIcon size={24} />}
            title="Couldn't resolve CKBFS file"
            description={(meta.error as Error).message}
          />
        </div>
      )}

      {meta.data && typeId && (
        <CkbfsFileBody meta={meta.data} typeId={typeId} />
      )}
    </div>
  );
}

function CkbfsFileBody({
  meta,
  typeId,
}: {
  meta: NonNullable<ReturnType<typeof indexer.getCkbfsMeta> extends Promise<infer T> ? T : never>;
  typeId: string;
}) {
  const contentUrl = indexer.ckbfsContentUrl(typeId);
  const isText = meta.content_type.startsWith('text/') || meta.content_type === 'application/json';
  const isImage = meta.content_type.startsWith('image/');

  return (
    <>
      <header className="mt-8 flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-br-surface-1 text-br-dim">
          <FileIcon />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">CKBFS v{meta.protocol_version}</div>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight">
            {meta.filename || 'untitled'}
          </h1>
          <p className="mt-1 text-sm text-br-muted">
            {meta.content_type} · {meta.byte_length.toLocaleString()} bytes · adler{' '}
            <span className="font-mono">0x{meta.checksum.toString(16).padStart(8, '0')}</span>
          </p>
        </div>
      </header>

      <div className="mt-8 rounded-lg bg-br-surface-1 p-5 shadow-sm">
        {isText && <TextPreview url={contentUrl} />}
        {isImage && (
          <img
            src={contentUrl}
            alt={meta.filename}
            className="max-h-[70vh] w-full rounded object-contain"
          />
        )}
        {!isText && !isImage && (
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-br-muted">Binary file, preview unavailable.</div>
            <a
              href={contentUrl}
              download={meta.filename}
              className="rounded bg-br-accent px-4 py-2 text-sm font-medium text-br-accent-ink hover:bg-br-accent-hover"
            >
              Download
            </a>
          </div>
        )}
      </div>
    </>
  );
}

function TextPreview({ url }: { url: string }) {
  const text = useQuery({
    queryKey: ['ckbfs-text', url],
    queryFn: () => fetch(url).then((r) => r.text()),
  });
  if (text.isLoading) return <Skeleton h="h-32" w="w-full" />;
  if (text.error)
    return <div className="text-sm text-br-danger">Error: {(text.error as Error).message}</div>;
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-br-fg">
      {text.data}
    </pre>
  );
}
