import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AccountFilter() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Accounts</SelectItem>
        <SelectItem value="main">Main Account</SelectItem>
        <SelectItem value="savings">Savings Account</SelectItem>
      </SelectContent>
    </Select>
  );
}