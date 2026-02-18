import React, { useEffect, useState } from 'react';

interface PageData {
  _id: string;
  path: string;
  updatedAt: string;
}

interface SearchResponse {
  ok: boolean;
  data: PageData[];
  meta?: {
    total: number;
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
    if (!pagePath) {
      setLoading(false);
      setError('ページパスを取得できませんでした。');
      return;
    }

    const query = encodeURIComponent(`"${pagePath}"`);
    fetch(`/_api/search?q=${query}&limit=50`, {
      credentials: 'same-origin',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json() as Promise<SearchResponse>;
      })
      .then((json) => {
        if (!json.ok) {
          throw new Error('検索APIがエラーを返しました。検索サービスが設定されているか確認してください。');
        }
        const filtered = json.data.filter((p) => p.path !== pagePath);
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
    return <div style={{ padding: '8px', color: '#666' }}>参照ページを読み込み中...</div>;
  }

  if (error) {
    return <div style={{ padding: '8px', color: '#c00' }}>エラー: {error}</div>;
  }

  if (pages.length === 0) {
    return <div style={{ padding: '8px', color: '#666' }}>このページを参照しているページはありません。</div>;
  }

  return (
    <div style={{ padding: '8px' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>このページを参照しているページ ({pages.length}件):</p>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {pages.map((page) => (
          <li key={page._id}>
            <a href={page.path}>{page.path}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
