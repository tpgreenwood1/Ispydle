import { HelpIcon, MagnifierIcon, StatsIcon } from "./Icons";

interface HeaderProps {
  onHelp: () => void;
  onStats: () => void;
}

export function Header({ onHelp, onStats }: HeaderProps) {
  return (
    <header className="header">
      <span className="logo" aria-hidden="true">
        <MagnifierIcon size={20} />
      </span>
      <h1 className="title">I spydle</h1>
      <button type="button" className="icon-button" aria-label="How to play" onClick={onHelp}>
        <HelpIcon />
      </button>
      <button type="button" className="icon-button" aria-label="Statistics" onClick={onStats}>
        <StatsIcon />
      </button>
    </header>
  );
}
