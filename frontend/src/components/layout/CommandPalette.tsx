import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Search, CornerDownLeft, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFilters } from "@/hooks/useFilters";
import { destinations } from "./navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { cohortSearch } = useFilters();
  const term = search.trim();
  const items = destinations.filter((item) =>
    `${item.label} ${item.detail}`.toLowerCase().includes(term.toLowerCase()),
  );
  const commands = [
    ...items,
    ...(term
      ? [
          {
            to: `/students/${encodeURIComponent(term)}`,
            label: `Open student ${term}`,
            icon: UserRound,
            detail: "Look up this exact student ID",
          },
        ]
      : []),
  ];
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      setSelected(0);
    }
  }
  useEffect(() => {
    function shortcut(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        setSearch("");
        setSelected(0);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function run(to: string) {
    changeOpen(false);
    navigate(`${to}${cohortSearch}`);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        (selected + (event.key === "ArrowDown" ? 1 : -1) + commands.length) %
        commands.length;
      setSelected(next);
      document
        .getElementById(`command-${next}`)
        ?.scrollIntoView?.({ block: "nearest" });
    }
    if (event.key === "Enter" && commands[selected]) {
      event.preventDefault();
      run(commands[selected].to);
    }
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button
          className="command-trigger"
          aria-label="Search and navigate"
          ref={trigger}
        >
          <Search size={16} aria-hidden="true" />
          <span>Search students, pages...</span>
          <kbd>Ctrl K</kbd>
        </button>
      </DialogTrigger>
      <DialogContent
        className="command-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Search EduNex</DialogTitle>
        <DialogDescription className="sr-only">
          Navigate to a page or enter an exact student ID. Use arrow keys to
          select and Enter to open.
        </DialogDescription>
        <div className="command-input-wrap">
          <Search size={20} aria-hidden="true" />
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={`command-${selected}`}
            aria-autocomplete="list"
            aria-label="Search pages or exact student ID"
            placeholder="Where would you like to go?"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelected(0);
            }}
            onKeyDown={keyDown}
          />
        </div>
        <p className="command-caption">
          {term ? "RESULTS & STUDENT LOOKUP" : "QUICK NAVIGATION"}
        </p>
        <div
          id="command-results"
          role="listbox"
          aria-label="Commands"
          className="command-results"
        >
          {commands.map(({ to, label, icon: Icon, detail }, index) => (
            <div
              key={to}
              id={`command-${index}`}
              role="option"
              aria-selected={index === selected}
              className="command-item"
              onMouseEnter={() => setSelected(index)}
              onClick={() => run(to)}
            >
              <span className="command-icon">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> Navigate
          </span>
          <span>
            <CornerDownLeft size={12} /> Open
          </span>
          <span>
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
