import { Calendar } from '@/components/ui/calendar';

export default function DateFilter() {
  return (
    <div className="flex items-center space-x-2">
      <Calendar mode="single" className="rounded-md border" />
    </div>
  );
}