import Svg, { Circle, Path, Rect, Ellipse, Line } from "react-native-svg";
export default function Art() {
  return (
    <Svg
      width="100%"
      height={230}
      viewBox="0 0 600 260"
      accessibilityLabel="Original illustrated football stadium"
    >
      <Rect width="600" height="260" rx="24" fill="#124c3c" />
      <Circle cx="490" cy="50" r="135" fill="#235b40" />
      <Path d="M0 188 Q150 80 320 188 T600 180 V260 H0Z" fill="#082d27" />
      <Path
        d="M105 240 L205 98 H423 L530 240Z"
        fill="#2a7650"
        stroke="#78b890"
        strokeWidth="2"
      />
      <Path
        d="M155 170 H478 M315 98 V240 M230 240 L250 205 H390 L410 240 M275 98 L265 120 H363 L352 98"
        fill="none"
        stroke="#89c69c"
        strokeWidth="2"
      />
      <Ellipse
        cx="322"
        cy="170"
        rx="36"
        ry="14"
        fill="none"
        stroke="#89c69c"
        strokeWidth="2"
      />
      <Circle cx="437" cy="101" r="60" fill="#d8f49c" />
      <Path
        d="M437 76 L459 92 L450 118 H424 L415 92Z M437 41 V57 M380 83 L397 89 M400 145 L412 129 M472 145 L460 129 M494 83 L477 89"
        fill="#123d30"
        stroke="#123d30"
        strokeWidth="9"
      />
      <Line x1="68" y1="61" x2="68" y2="161" stroke="#93c7a0" strokeWidth="3" />
      <Path d="M68 61 L105 69 V89 L68 81Z" fill="#d8f49c" />
      <Circle cx="160" cy="50" r="3" fill="#d8f49c" />
      <Circle cx="550" cy="202" r="3" fill="#d8f49c" />
    </Svg>
  );
}
