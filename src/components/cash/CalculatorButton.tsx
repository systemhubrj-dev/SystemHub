import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator as CalculatorIcon, Delete } from "lucide-react";

function calculate(a: number, op: string, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? 0 : a / b;
    default: return b;
  }
}

export function CalculatorButton() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const reset = () => {
    setDisplay("0");
    setStored(null);
    setPendingOp(null);
    setJustEvaluated(false);
  };

  const pressDigit = (d: string) => {
    if (justEvaluated) {
      setDisplay(d === "." ? "0." : d);
      setJustEvaluated(false);
      return;
    }
    if (d === "." && display.includes(".")) return;
    setDisplay(display === "0" && d !== "." ? d : display + d);
  };

  const pressOp = (op: string) => {
    const current = parseFloat(display);
    if (stored !== null && pendingOp && !justEvaluated) {
      setStored(calculate(stored, pendingOp, current));
    } else {
      setStored(current);
    }
    setPendingOp(op);
    setJustEvaluated(false);
    setDisplay("0");
  };

  const pressEquals = () => {
    if (stored === null || !pendingOp) return;
    const result = calculate(stored, pendingOp, parseFloat(display));
    setDisplay(String(Number(result.toFixed(10))));
    setStored(null);
    setPendingOp(null);
    setJustEvaluated(true);
  };

  const backspace = () => {
    setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
  };

  const pressKey = (k: string) => {
    if (k === "=") { pressEquals(); return; }
    if (["+", "-", "×", "÷"].includes(k)) { pressOp(k); return; }
    pressDigit(k);
  };

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <CalculatorIcon className="h-4 w-4 mr-1" /> Calculadora
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Calculadora</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted rounded-md px-4 py-3 text-right text-2xl font-mono truncate">
              {display}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button variant="secondary" className="col-span-2" onClick={reset}>C</Button>
              <Button variant="secondary" onClick={backspace}><Delete className="h-4 w-4" /></Button>
              <Button variant="secondary" onClick={() => pressOp("÷")}>÷</Button>

              <Button variant="outline" onClick={() => pressKey("7")}>7</Button>
              <Button variant="outline" onClick={() => pressKey("8")}>8</Button>
              <Button variant="outline" onClick={() => pressKey("9")}>9</Button>
              <Button variant="secondary" onClick={() => pressOp("×")}>×</Button>

              <Button variant="outline" onClick={() => pressKey("4")}>4</Button>
              <Button variant="outline" onClick={() => pressKey("5")}>5</Button>
              <Button variant="outline" onClick={() => pressKey("6")}>6</Button>
              <Button variant="secondary" onClick={() => pressOp("-")}>-</Button>

              <Button variant="outline" onClick={() => pressKey("1")}>1</Button>
              <Button variant="outline" onClick={() => pressKey("2")}>2</Button>
              <Button variant="outline" onClick={() => pressKey("3")}>3</Button>
              <Button variant="secondary" onClick={() => pressOp("+")}>+</Button>

              <Button variant="outline" className="col-span-2" onClick={() => pressKey("0")}>0</Button>
              <Button variant="outline" onClick={() => pressKey(".")}>.</Button>
              <Button variant="default" onClick={pressEquals}>=</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
