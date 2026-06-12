interface SearchResultProps {
  keyword: string;
  content: string;
  isGeneratingReport?: boolean;
}

function linkify(text: string) {
  const urlPattern = /(https?:\/\/[^\s<>"')\]]+)/g;
  const parts = text.split(urlPattern);

  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="search-link"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function SearchResult({
  keyword,
  content,
  isGeneratingReport,
}: SearchResultProps) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="search-result">
      <div className="search-header">
        <h2 className="search-title">검색 결과</h2>
        <p className="search-keyword">&quot;{keyword}&quot;</p>
        {isGeneratingReport && (
          <p className="search-status">보고서 작성 중...</p>
        )}
      </div>
      <div className="search-content">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="search-paragraph">
            {linkify(paragraph.replace(/\n/g, " "))}
          </p>
        ))}
      </div>
    </div>
  );
}
