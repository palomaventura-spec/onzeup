type RadarItem = {
  label: string;
  value: number;
  comparisonValue?: number | null;
};

type PerformanceRadarChartProps = {
  items: RadarItem[];
  currentLabel?: string;
  comparisonLabel?: string;
};

const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 132;

function point(index: number, total: number, percentage: number, radius = RADIUS) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
  const distance = radius * Math.max(0, Math.min(100, percentage)) / 100;
  return {
    x: CENTER + Math.cos(angle) * distance,
    y: CENTER + Math.sin(angle) * distance,
  };
}

function polygonPoints(values: number[]) {
  return values
    .map((value, index) => {
      const coordinate = point(index, values.length, value);
      return `${coordinate.x},${coordinate.y}`;
    })
    .join(" ");
}

export default function PerformanceRadarChart({
  items,
  currentLabel = "Avaliação atual",
  comparisonLabel = "Avaliação inicial",
}: PerformanceRadarChartProps) {
  if (items.length < 3) return null;

  const hasComparison = items.some(
    (item) => item.comparisonValue !== null && item.comparisonValue !== undefined
  );

  return (
    <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
      <svg
        viewBox="-70 -15 540 445"
        role="img"
        aria-label="Gráfico radar das valências de performance"
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {[25, 50, 75, 100].map((level) => (
          <polygon
            key={level}
            points={polygonPoints(items.map(() => level))}
            fill={level === 100 ? "#f8fafb" : "none"}
            stroke="#d8e1e5"
            strokeWidth="1"
          />
        ))}

        {items.map((item, index) => {
          const end = point(index, items.length, 100);
          const label = point(index, items.length, 100, RADIUS + 35);
          return (
            <g key={item.label}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                stroke="#d8e1e5"
                strokeWidth="1"
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.x < CENTER - 8 ? "end" : label.x > CENTER + 8 ? "start" : "middle"}
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="800"
              fill="#26343b"
            >
                {item.label} • {Math.round(item.value)}%
              </text>
            </g>
          );
        })}

        {hasComparison ? (
          <polygon
            points={polygonPoints(
              items.map((item) => item.comparisonValue ?? 0)
            )}
            fill="rgba(100,116,139,.08)"
            stroke="#64748b"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
        ) : null}

        <polygon
          points={polygonPoints(items.map((item) => item.value))}
          fill="rgba(145,220,0,.28)"
          stroke="#78b900"
          strokeWidth="3"
        />

        {items.map((item, index) => {
          const coordinate = point(index, items.length, item.value);
          return (
            <circle
              key={`${item.label}-point`}
              cx={coordinate.x}
              cy={coordinate.y}
              r="4"
              fill="#ffffff"
              stroke="#78b900"
              strokeWidth="3"
            />
          );
        })}

        <circle cx={CENTER} cy={CENTER} r="3" fill="#26343b" />
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 18,
          flexWrap: "wrap",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <span>
          <i
            style={{
              display: "inline-block",
              width: 18,
              height: 4,
              marginRight: 6,
              background: "#78b900",
              verticalAlign: "middle",
            }}
          />
          {currentLabel}
        </span>

        {hasComparison ? (
          <span>
            <i
              style={{
                display: "inline-block",
                width: 18,
                marginRight: 6,
                borderTop: "2px dashed #64748b",
                verticalAlign: "middle",
              }}
            />
            {comparisonLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
