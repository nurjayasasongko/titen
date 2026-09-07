/**
 * Geometry for a topology view: packets travel along cabled routes between
 * boxes, so every link is a polyline and every packet is a distance along
 * one. Pure maths, no DOM — the scene is drawn from these numbers.
 */

export function centreOf(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 }
}

/**
 * Builds the waypoints for a link. Sources fan into a vertical bus before
 * turning towards their destination, which is what makes the picture read
 * as cabling rather than as arrows.
 */
export function routeOf(from, to, options = {}) {
  const a = centreOf(from)
  const b = centreOf(to)

  if (options.bus !== undefined) {
    return [
      { x: from.x + from.w, y: a.y },
      { x: options.bus, y: a.y },
      { x: options.bus, y: b.y },
      { x: to.x, y: b.y },
    ]
  }

  if (options.back !== undefined) {
    return [
      { x: a.x, y: from.y + from.h },
      { x: a.x, y: options.back },
      { x: b.x, y: options.back },
      { x: b.x, y: to.y + to.h },
    ]
  }

  if (options.down) {
    return [
      { x: a.x, y: from.y + from.h },
      { x: a.x, y: b.y },
      { x: to.x + (a.x > b.x ? to.w : 0), y: b.y },
    ]
  }

  return [
    { x: from.x + from.w, y: a.y },
    { x: to.x, y: b.y },
  ]
}

/** Pre-computes segment lengths so a position lookup is cheap per frame. */
export function measure(points) {
  const segments = []
  let length = 0
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len === 0) continue
    segments.push({ a, b, len, start: length })
    length += len
  }
  return { points, segments, length }
}

/** Position at `t` (0 → 1) along the route. */
export function pointAt(route, t) {
  const clamped = Math.min(Math.max(t, 0), 1)
  const target = clamped * route.length
  for (const segment of route.segments) {
    if (target <= segment.start + segment.len) {
      const local = segment.len === 0 ? 0 : (target - segment.start) / segment.len
      return {
        x: segment.a.x + (segment.b.x - segment.a.x) * local,
        y: segment.a.y + (segment.b.y - segment.a.y) * local,
      }
    }
  }
  const last = route.segments[route.segments.length - 1]
  return last ? { x: last.b.x, y: last.b.y } : { x: 0, y: 0 }
}

/** The `d` attribute for drawing the cable itself. */
export function pathOf(route) {
  return route.points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ')
}
