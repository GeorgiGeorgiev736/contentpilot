// Small badge showing the credit cost of an AI action
// Usage: <CreditBadge cost={3} />  →  shows "3 ✦"
export default function CreditBadge({ cost, style = {} }) {
  if (!cost) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: "#7C5CFC18", border: "1px solid #7C5CFC33",
      color: "#B09FFF", fontSize: 11, fontWeight: 700,
      padding: "1px 7px", borderRadius: 20, lineHeight: 1.6,
      letterSpacing: ".02em",
      ...style,
    }}>
      {cost}✦
    </span>
  );
}
