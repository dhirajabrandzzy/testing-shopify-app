type LaraPushBrandBarProps = {
  subtitle?: string;
};

export function LaraPushBrandBar({ subtitle }: LaraPushBrandBarProps) {
  return (
    <div className="lp-brand-bar">
      <img
        src="/logo-long-blue.svg"
        alt="LaraPush"
        className="lp-brand-logo"
        width={155}
        height={37}
      />
      {subtitle ? <p className="lp-brand-text">{subtitle}</p> : null}
    </div>
  );
}
