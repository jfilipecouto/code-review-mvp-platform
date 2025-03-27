interface InsightSectionProps {
  title: string;
  content: string[];
  type?: 'list' | 'text';
}

export function InsightSection({ title, content, type = 'text' }: InsightSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        {title}
      </h3>
      {type === 'list' ? (
        <ul className="space-y-2">
          {content.map((item, index) => (
            <li key={index} className="text-gray-600 dark:text-gray-400 leading-relaxed">
              • {item.trim().startsWith('-') ? item.substring(1).trim() : item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          {content.map((text, index) => (
            <p key={index} className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
} 