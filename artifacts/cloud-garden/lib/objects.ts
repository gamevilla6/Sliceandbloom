import Matter from 'matter-js';
import type { Block, V } from './levels';

/** Physics factories keep collision labels independent of SVG presentation. */
export function createCloud(position: V, radius = 11) {
  const body = Matter.Bodies.circle(position.x, position.y, radius, {
    restitution: 0.2,
    friction: 0.002,
    frictionStatic: 0,
    frictionAir: 0.001,
    density: 0.002,
    label: 'drop',
  });
  // Hold a fully initialized dynamic body; creating it static loses the finite
  // mass/inertia that Matter needs when it is released later.
  Matter.Body.setStatic(body, true);
  body.plugin = { renderId: `cloud-${body.id}` };
  return body;
}

export function createPlant(position: V) {
  return Matter.Bodies.circle(position.x, position.y, 30, {
    isStatic: true,
    isSensor: true,
    label: 'plant',
  });
}

export function createWood(block: Block) {
  return Matter.Bodies.rectangle(block.x, block.y, block.w, block.h, {
    isStatic: !block.dynamic,
    density: 0.0005,
    friction: 0.3,
    frictionAir: 0.004,
    restitution: 0.1,
    angle: block.angle ?? 0,
    label: 'cut',
    plugin: { skin: 'wood' },
  });
}

export function createRope(bodyA: Matter.Body, bodyB: Matter.Body, pointA: V = { x: 0, y: 0 }, pointB: V = { x: 0, y: 0 }) {
  return Matter.Constraint.create({
    bodyA,
    bodyB,
    pointA: { ...pointA },
    pointB: { ...pointB },
    stiffness: 0.95,
    damping: 0.04,
    label: 'rope',
  });
}
