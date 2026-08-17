import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export interface PeriodRange {
  from: Date;
  to: Date;
  label: string;
}

interface Props {
  value: PeriodRange;
  onChange: (range: PeriodRange) => void;
}

export function PeriodFilter({ value, onChange }: Props) {
  const currentMonthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const [preset, setPreset] = useState<string>(value.label === currentMonthLabel ? "current_month" : "custom");
  const [openCalendar, setOpenCalendar] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>({ from: value.from, to: value.to });

  const applyPreset = (p: string) => {
    setPreset(p);
    const now = new Date();
    let r: PeriodRange;
    switch (p) {
      case "current_month":
        r = { from: startOfMonth(now), to: endOfMonth(now), label: format(now, "MMMM 'de' yyyy", { locale: ptBR }) };
        break;
      case "last_month": {
        const prev = subMonths(now, 1);
        r = { from: startOfMonth(prev), to: endOfMonth(prev), label: format(prev, "MMMM 'de' yyyy", { locale: ptBR }) };
        break;
      }
      case "last_7":
        r = { from: subDays(now, 6), to: now, label: "Últimos 7 dias" };
        break;
      case "last_30":
        r = { from: subDays(now, 29), to: now, label: "Últimos 30 dias" };
        break;
      case "last_90":
        r = { from: subDays(now, 89), to: now, label: "Últimos 90 dias" };
        break;
      case "year":
        r = { from: startOfYear(now), to: endOfYear(now), label: `Ano ${format(now, "yyyy")}` };
        break;
      default:
        return;
    }
    onChange(r);
  };

  const applyCustom = () => {
    if (customRange?.from && customRange?.to) {
      onChange({
        from: customRange.from,
        to: customRange.to,
        label: `${format(customRange.from, "dd/MM/yyyy")} – ${format(customRange.to, "dd/MM/yyyy")}`,
      });
      setPreset("custom");
      setOpenCalendar(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={preset} onValueChange={applyPreset}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="current_month">Este mês</SelectItem>
          <SelectItem value="last_month">Mês passado</SelectItem>
          <SelectItem value="last_7">Últimos 7 dias</SelectItem>
          <SelectItem value="last_30">Últimos 30 dias</SelectItem>
          <SelectItem value="last_90">Últimos 90 dias</SelectItem>
          <SelectItem value="year">Ano atual</SelectItem>
          <SelectItem value="custom">Personalizado…</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("justify-start text-left font-normal min-w-[220px]")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={setCustomRange}
            numberOfMonths={2}
            locale={ptBR}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="flex justify-end gap-2 p-3 border-t">
            <Button variant="ghost" size="sm" onClick={() => setOpenCalendar(false)}>Cancelar</Button>
            <Button size="sm" onClick={applyCustom} disabled={!customRange?.from || !customRange?.to}>Aplicar</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
