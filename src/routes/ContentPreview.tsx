import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';

export function ContentPreview() {
  const { typeId } = useParams<{ typeId: string }>();
  const meta = useQuery({
    queryKey: ['ckbfs-meta', typeId],
    queryFn: () => indexer.getCkbfsMeta(typeId!),
    enabled: !!typeId,
  });

  if (!typeId) return <div className="p-8">No CKBFS type_id.</div>;
  if (meta.isLoading) return <div className="p-8 text-byterent-muted">Loading metadata…</div>;
  if (meta.error)
    return <div className="p-8 text-red-400">Error: {(meta.error as Error).message}</div>;
  if (!meta.data) return null;

  const m = meta.data;
  const contentUrl = indexer.ckbfsContentUrl(typeId);
  const isText = m.content_type.startsWith('text/') || m.content_type === 'application/json';
  const isImage = m.content_type.startsWith('image/');

  return (
    <div className="p-8 max-w-5xl">
      <Link to="/" className="text-sm text-byterent-muted hover:text-white">
        ← back
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{m.filename || 'untitled'}</h1>
        <p className="text-byterent-muted mt-1">
          {m.content_type} · {m.byte_length.toLocaleString()} bytes · CKBFS v{m.protocol_version}
        </p>
      </header>

      <div className="rounded-xl border border-byterent-border bg-byterent-elevated p-4">
        {isText && <TextPreview url={contentUrl} />}
        {isImage && <img src={contentUrl} alt={m.filename} className="max-w-full rounded" />}
        {!isText && !isImage && (
          <a
            href={contentUrl}
            download={m.filename}
            className="text-byterent-accent hover:underline"
          >
            Download {m.filename}
          </a>
        )}
      </div>
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const text = useQuery({
    queryKey: ['ckbfs-text', url],
    queryFn: () => fetch(url).then((r) => r.text()),
  });
  if (text.isLoading) return <div className="text-byterent-muted">Loading…</div>;
  if (text.error)
    return <div className="text-red-400">Error: {(text.error as Error).message}</div>;
  return (
    <pre className="whitespace-pre-wrap break-words text-sm text-white">{text.data}</pre>
  );
}
