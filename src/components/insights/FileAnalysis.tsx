interface FileAnalysisProps {
  fileName: string;
  content: string;
}

export function FileAnalysis({ fileName, content }: FileAnalysisProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
      <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
        {fileName}
      </h5>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
        {content}
      </p>
    </div>
  );
} 