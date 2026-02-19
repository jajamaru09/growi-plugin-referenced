import React, { useEffect, useState } from 'react';

interface PageData {
  _id: string;
  path: string;
  updatedAt: string;
}

interface SearchResultItem {
  data: PageData;
  meta: object;
}

interface SearchResponse {
  ok: boolean;
  data: SearchResultItem[];
  meta?: {
    total: number;
    hitsCount: number;
  };
}

interface ReferencedListProps {
  pagePath: string;
}

export function ReferencedList({ pagePath }: ReferencedListProps): React.ReactElement {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ページIDはURLのパス部分（http://host/<pageId> の pageId）から取得する
    const pageId = window.location.pathname.slice(1);
    console.log('[growi-plugin-referenced] ReferencedList mounted, pagePath:', pagePath, 'pageId:', pageId);

    if (!pageId) {
      setLoading(false);
      setError('Could not get page ID from URL.');
      return;
    }

    const query = encodeURIComponent(`"${pageId}"`);
    const url = `/_api/search?q=${query}&limit=50`;
    console.log('[growi-plugin-referenced] fetching:', url);
    fetch(url, {
      credentials: 'same-origin',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json() as Promise<SearchResponse>;
      })
      .then((json) => {
        console.log('[growi-plugin-referenced] search response:', json);
        if (!json.ok) {
          throw new Error('Search API returned an error. Please check if the search service is configured.');
        }
        const filtered = json.data
          .map((item) => item.data)
          .filter((p) => p._id !== pageId);
        console.log('[growi-plugin-referenced] filtered pages:', filtered);
        setPages(filtered);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pagePath]);

  if (loading) {
    return <div style={{ padding: '4px 0', color: '#aaa', fontSize: '0.9em' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: '4px 0', color: '#c00', fontSize: '0.9em' }}>Error: {error}</div>;
  }

  if (pages.length === 0) {
    return <div style={{ padding: '4px 0', color: '#aaa', fontSize: '0.9em' }}>There are no pages that refer to this page.</div>;
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <ul style={{ margin: 0, paddingLeft: '1.5em' }}>
        {pages.map((page) => (
          <li key={page._id}>
            <a href={page.path}>{page.path}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
