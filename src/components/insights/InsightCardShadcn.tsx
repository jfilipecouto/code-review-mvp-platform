import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface InsightCardShadcnProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function InsightCardShadcn({ title, children, className = "" }: InsightCardShadcnProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
} 