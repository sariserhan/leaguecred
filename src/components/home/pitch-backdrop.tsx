/**
 * A pitch seen from above, at the real proportions: 105m by 68m, a 16.5m
 * penalty area 40.32m wide, a 5.5m goal area, penalty spots 11m out, and a
 * 9.15m radius for both the centre circle and the penalty arcs.
 *
 * The penalty arc is cut where it meets the box edge rather than drawn as a
 * full circle, which is the detail that separates a pitch from a rectangle with
 * circles on it. That intersection is derived below rather than written out, so
 * changing a dimension cannot leave the arc floating off the line.
 *
 * Decorative: the caller hides it from assistive technology.
 */
const LENGTH = 105;
const WIDTH = 68;
const CENTRE_Y = WIDTH / 2;
const RADIUS = 9.15;
const BOX_DEPTH = 16.5;
const BOX_WIDTH = 40.32;
const GOAL_AREA_DEPTH = 5.5;
const GOAL_AREA_WIDTH = 18.32;
const PENALTY_SPOT = 11;
const GOAL_WIDTH = 7.32;
const GOAL_DEPTH = 1.8;
const CORNER = 1;

/** Where the penalty arc crosses the edge of the box. Rounded so the derived
 * value does not ship a trail of floating-point digits into the markup. */
const ARC_HALF_HEIGHT =
  Math.round(Math.sqrt(RADIUS ** 2 - (BOX_DEPTH - PENALTY_SPOT) ** 2) * 1e4) / 1e4;
const ARC_TOP = CENTRE_Y - ARC_HALF_HEIGHT;
const ARC_BOTTOM = CENTRE_Y + ARC_HALF_HEIGHT;

const boxY = (CENTRE_Y * 2 - BOX_WIDTH) / 2;
const goalAreaY = (CENTRE_Y * 2 - GOAL_AREA_WIDTH) / 2;
const goalY = (CENTRE_Y * 2 - GOAL_WIDTH) / 2;

export function PitchBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LENGTH} ${WIDTH}`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={0.35}
    >
      <rect x="0" y="0" width={LENGTH} height={WIDTH} />

      <line x1={LENGTH / 2} y1="0" x2={LENGTH / 2} y2={WIDTH} />
      <circle cx={LENGTH / 2} cy={CENTRE_Y} r={RADIUS} />
      <circle cx={LENGTH / 2} cy={CENTRE_Y} r="0.5" fill="currentColor" stroke="none" />

      {/* left half */}
      <rect x="0" y={boxY} width={BOX_DEPTH} height={BOX_WIDTH} />
      <rect x="0" y={goalAreaY} width={GOAL_AREA_DEPTH} height={GOAL_AREA_WIDTH} />
      <circle cx={PENALTY_SPOT} cy={CENTRE_Y} r="0.5" fill="currentColor" stroke="none" />
      <path d={`M ${BOX_DEPTH} ${ARC_TOP} A ${RADIUS} ${RADIUS} 0 0 1 ${BOX_DEPTH} ${ARC_BOTTOM}`} />
      <rect x={-GOAL_DEPTH} y={goalY} width={GOAL_DEPTH} height={GOAL_WIDTH} />

      {/* right half, mirrored */}
      <rect x={LENGTH - BOX_DEPTH} y={boxY} width={BOX_DEPTH} height={BOX_WIDTH} />
      <rect x={LENGTH - GOAL_AREA_DEPTH} y={goalAreaY} width={GOAL_AREA_DEPTH} height={GOAL_AREA_WIDTH} />
      <circle cx={LENGTH - PENALTY_SPOT} cy={CENTRE_Y} r="0.5" fill="currentColor" stroke="none" />
      <path
        d={`M ${LENGTH - BOX_DEPTH} ${ARC_TOP} A ${RADIUS} ${RADIUS} 0 0 0 ${LENGTH - BOX_DEPTH} ${ARC_BOTTOM}`}
      />
      <rect x={LENGTH} y={goalY} width={GOAL_DEPTH} height={GOAL_WIDTH} />

      {/* corner arcs */}
      <path d={`M ${CORNER} 0 A ${CORNER} ${CORNER} 0 0 1 0 ${CORNER}`} />
      <path d={`M ${LENGTH - CORNER} 0 A ${CORNER} ${CORNER} 0 0 0 ${LENGTH} ${CORNER}`} />
      <path d={`M 0 ${WIDTH - CORNER} A ${CORNER} ${CORNER} 0 0 1 ${CORNER} ${WIDTH}`} />
      <path d={`M ${LENGTH - CORNER} ${WIDTH} A ${CORNER} ${CORNER} 0 0 1 ${LENGTH} ${WIDTH - CORNER}`} />
    </svg>
  );
}
