import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function DateInput({ value, onChange, label, className }) {
  // Parse the value if it exists
  const parseDate = (dateStr) => {
    if (!dateStr) return { year: '', month: '', day: '' };
    const date = new Date(dateStr);
    return {
      year: date.getFullYear().toString(),
      month: (date.getMonth() + 1).toString().padStart(2, '0'),
      day: date.getDate().toString().padStart(2, '0')
    };
  };

  const [parts, setParts] = useState(parseDate(value));

  const years = Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleChange = (field, val) => {
    const newParts = { ...parts, [field]: val };
    setParts(newParts);
    
    // Only call onChange if all parts are filled
    if (newParts.year && newParts.month && newParts.day) {
      const dateStr = `${newParts.year}-${newParts.month}-${newParts.day}`;
      onChange?.(dateStr);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div className="grid grid-cols-3 gap-2">
        <Select value={parts.day} onValueChange={(val) => handleChange('day', val)}>
          <SelectTrigger>
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {days.map((day) => (
              <SelectItem key={day} value={day}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={parts.month} onValueChange={(val) => handleChange('month', val)}>
          <SelectTrigger>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {months.map((month) => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={parts.year} onValueChange={(val) => handleChange('year', val)}>
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
