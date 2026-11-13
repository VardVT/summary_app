import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrainingDocument } from '../types';
import { fetchLibraryDocuments, getDocumentDownloadUrl } from '../services/trainingApi';

export function useDocuments(canViewDocuments: boolean) {
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!canViewDocuments) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const list = await fetchLibraryDocuments();
      setDocuments(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thư viện tài liệu.');
    } finally {
      setLoading(false);
    }
  }, [canViewDocuments]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.storage_path.toLowerCase().includes(q),
    );
  }, [documents, searchQuery]);

  const downloadDocument = useCallback(async (doc: TrainingDocument) => {
    setDownloadingId(doc.id);
    setError(null);
    try {
      const url = await getDocumentDownloadUrl(doc);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = doc.title;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo liên kết tải tài liệu.');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return {
    documents: filteredDocuments,
    allDocuments: documents,
    searchQuery,
    setSearchQuery,
    loading,
    downloadingId,
    error,
    reload,
    downloadDocument,
  };
}
