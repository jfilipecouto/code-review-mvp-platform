interface InsightCardProps {
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'bordered' | 'highlighted';
}

export function InsightCard({ title, children, variant = 'default' }: InsightCardProps) {
  const variants = {
    default: "bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg",
    bordered: "bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-green-500",
    highlighted: "bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-lg"
  };

  return (
    <div className={variants[variant]}>
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
} 