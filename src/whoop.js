/*
 * whoop.js: the 65 mm ducted whoop, at the size it actually is.
 *
 * Its own file rather than a flag inside drone.js, for the reason the
 * simulator's whoopcraft.js gives: the two aircraft do not share a
 * silhouette. A five inch is four arms and four open discs, and what you see
 * is the X. A whoop is a SOLID, a moulded tub with four holes in it, and the
 * ducts are the outermost thing on it in every direction. One builder with
 * two of everything and a boolean in it would belong to neither machine.
 *
 * Ported from WebFPVSimulator/src/render/whoopcraft.js, which models a
 * BetaFPV Air65 II Champion, the machine src/native/plant.c flies as
 * SIM_AIRFRAME_WHOOP65. The numbers are quoted, not chosen:
 *
 *   wheelbase   65 mm motor to motor across the diagonal
 *   width       82.6 mm over the ducts, which is the whole aircraft
 *   duct bore   33 mm, a 31 mm Gemfan 1207 three blade with a 1 mm gap
 *   pack        a 1S LAVA II 280 mAh under the belly
 *   all up      23.4 g
 *
 * THE SCALE IS THE POINT OF THE ACT, so nothing here is rounded up to be
 * easier to see. This aircraft is a fifth of the five inch across and a
 * thirtieth of its weight, and against a 711 mm gate it looks it. If a shot
 * needs the machine bigger, the camera moves.
 *
 * IT IS SOLD BARE AND IT IS DRAWN BARE. An Air65 II has no canopy: the flight
 * controller is the top of the aircraft and you look straight down at the
 * green, and the only tall thing on it is the camera. So the palette lands
 * differently here from drone.js on purpose. The moulding is the light cool
 * grey it really is, the board is the green every flight controller is, and
 * sakura is one trim line on the camera cage with mint on the lamps.
 *
 * This file is part of the WebFPVSimulator landing page.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY, without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import * as THREE from 'three';
import { celMaterial, outlineHull, PALETTE as P } from './cel.js';
import { LITE, SEG } from './quality.js';

/* Motor centre from the airframe centre, and the same distance per axis:
 * the motors sit on the diagonals, so a 65 mm wheelbase is 32.5 mm out. */
export const WHOOP_ARM = 0.0325;
const MOTOR_ARM = WHOOP_ARM / Math.SQRT2;

export const WHOOP_PROP_R = 0.0155;
/* The outside of the duct IS the hull: there is no part of this aircraft
 * further out than the bumper hoop over the lip, which is why it survives
 * hitting a wall and why it flies badly sideways. */
export const WHOOP_HULL_R = 0.0181;
const DUCT_BORE = 0.0165;
const DUCT_WALL = WHOOP_HULL_R - DUCT_BORE;
const DUCT_TOP = 0.0055;
const ROTOR_Y = 0.0035;

/*
 * The lens, and it is NOT drone.js's mount.
 *
 * Those two are the five inch's, 80 mm forward and 18 mm up, which on a
 * machine 82 mm across would put the camera a body length in front of the
 * aircraft. The Air65 II carries a C03 at the front of its stack: 24 mm
 * forward and 12 mm up, which is the same pair src/native/plant.c gives the
 * whoop, and the same 25 degrees of uptilt configs/airframes.js ships it on.
 * A whoop is tilted back less than a five inch because it is slower.
 */
export const WHOOP_MOUNT_FORWARD = 0.024;
export const WHOOP_MOUNT_UP = 0.012;
export const WHOOP_CAM_TILT_DEG = 25;
/* What the pilot sees through it. configs/airframes.js, and it is wider than
 * the five inch's 85 because indoors everything is close. */
export const WHOOP_FOV = 95;

/* Props in, as seen from above, in Betaflight's motor order: RR FR RL FL
 * with the front at -z. Same convention as drone.js, same signs. */
export const PROP_SPIN = [-1, 1, 1, -1];

function bake(geo, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = geo.clone();
  if (rx) {
    g.rotateX(rx);
  }
  if (ry) {
    g.rotateY(ry);
  }
  if (rz) {
    g.rotateZ(rz);
  }
  g.translate(x, y, z);
  return g;
}

/*
 * The duct, as a lathe, and the profile matters.
 *
 * A whoop duct is not a can: a rounded inlet lip on top, a straight throat,
 * and an OPEN exit. The wall stops a few millimetres under the disc, so from
 * anywhere below the horizon you see straight through the aircraft and out
 * the other side. The simulator learned that the hard way; a wall carried
 * down to a closed skirt reads as a tub of four soup tins.
 */
function ductLathe(segments) {
  const ri = DUCT_BORE;
  const ro = DUCT_BORE + DUCT_WALL;
  return new THREE.LatheGeometry([
    new THREE.Vector2(ro - 0.0004, ROTOR_Y - 0.0052),
    new THREE.Vector2(ro, ROTOR_Y - 0.0042),
    new THREE.Vector2(ro, DUCT_TOP - 0.0014),
    /* the rounded inlet lip */
    new THREE.Vector2(ro - 0.0003, DUCT_TOP - 0.0003),
    new THREE.Vector2(ro - 0.0011, DUCT_TOP),
    new THREE.Vector2(ri + 0.0005, DUCT_TOP - 0.0005),
    /* down the throat to the open exit */
    new THREE.Vector2(ri, DUCT_TOP - 0.0016),
    new THREE.Vector2(ri, ROTOR_Y - 0.0040),
    new THREE.Vector2(ri + 0.0006, ROTOR_Y - 0.0052),
  ], segments);
}

/*
 * A GF1207 blade, and it is a different shape from a five inch's: far lower
 * pitch, much wider chord for the radius, and a blunt tip, because at a
 * chord Reynolds number near eleven thousand a slender high aspect blade
 * simply stops working. That fact is visible in the silhouette, so it is
 * drawn rather than described.
 */
function bladeGeometry(segments) {
  const r = WHOOP_PROP_R;
  const s = new THREE.Shape();
  s.moveTo(0.0011, 0.0022);
  s.bezierCurveTo(0.0052, -0.0026, 0.0058, -r * 0.46, 0.0022, -r * 0.93);
  s.lineTo(-0.0019, -r * 0.90);
  s.bezierCurveTo(-0.0052, -r * 0.42, -0.0034, -0.0022, -0.0007, 0.0022);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.0007, bevelEnabled: false, curveSegments: segments,
  });
}

/* The blur plate. Same trick drone.js uses and the same reason: four
 * stopped blades on a machine doing 40,000 rpm is the one thing that says
 * "this is a render" louder than anything else in the frame. */
function discTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 3, 32, 32, 31);
  g.addColorStop(0, 'rgba(200, 208, 214, 0.55)');
  g.addColorStop(0.62, 'rgba(176, 188, 198, 0.34)');
  g.addColorStop(0.93, 'rgba(210, 220, 228, 0.42)');
  g.addColorStop(1, 'rgba(210, 220, 228, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWhoop() {
  const group = new THREE.Group();
  group.name = 'whoop';

  const mould = celMaterial({ color: 0xb9bfc4, rim: 0.30, spec: 0.24 });
  const mouldLow = celMaterial({ color: 0x8d949a, rim: 0.22, spec: 0.12 });
  const board = celMaterial({ color: P.pcb, rim: 0.26, spec: 0.30 });
  const dark = celMaterial({ color: P.camBody, rim: 0.34, spec: 0.20 });
  const trim = celMaterial({ color: P.canopy, rim: 0.38, spec: 0.34 });
  const pack = celMaterial({ color: 0x2b2f38, rim: 0.24, spec: 0.14 });
  const bladeMat = celMaterial({ color: 0xd8dde2, rim: 0.34, spec: 0.36 });

  /*
   * THE TUB. Four ducts and the webs between them, and it is one merged idea
   * rather than four cans on a plate: on the real moulding the ducts ARE the
   * frame and the webs are what is left over where two of them meet.
   */
  const ductGeo = ductLathe(LITE ? 14 : 22);
  const hoopGeo = new THREE.TorusGeometry(
    WHOOP_HULL_R - 0.0007, 0.0008, LITE ? 5 : 7, LITE ? 16 : 26,
  );
  /* RR FR RL FL, front at -z, in the order PROP_SPIN is written in. Spelled
   * out rather than derived from a pair of sign expressions, because sign
   * gymnastics is exactly what puts a duct in the wrong corner. */
  const motors = [
    new THREE.Vector3(MOTOR_ARM, 0, MOTOR_ARM),
    new THREE.Vector3(MOTOR_ARM, 0, -MOTOR_ARM),
    new THREE.Vector3(-MOTOR_ARM, 0, MOTOR_ARM),
    new THREE.Vector3(-MOTOR_ARM, 0, -MOTOR_ARM),
  ];

  const shellParts = [];
  for (const m of motors) {
    shellParts.push(bake(ductGeo, m.x, 0, m.z));
    /* The bumper hoop over the lip. Its OUTER edge is the duct's outer face:
     * the simulator found this drawn 1.9 mm proud, which is 2 mm of aeroplane
     * outside the radius the collider sweeps. */
    shellParts.push(bake(hoopGeo, m.x, DUCT_TOP + 0.0006, m.z, Math.PI * 0.5));
  }
  /* The webs. Four short bars closing the gaps between adjacent ducts, plus
   * the centre plate the stack bolts to. */
  const webGeo = new THREE.BoxGeometry(0.0175, 0.0034, 0.0075);
  shellParts.push(bake(webGeo, 0, 0.0012, MOTOR_ARM));
  shellParts.push(bake(webGeo, 0, 0.0012, -MOTOR_ARM));
  shellParts.push(bake(webGeo, MOTOR_ARM, 0.0012, 0, 0, Math.PI * 0.5));
  shellParts.push(bake(webGeo, -MOTOR_ARM, 0.0012, 0, 0, Math.PI * 0.5));
  shellParts.push(bake(new THREE.BoxGeometry(0.0215, 0.0030, 0.0245), 0, 0.0014, 0));

  const shell = new THREE.Mesh(mergeParts(shellParts), mould);
  shell.castShadow = false;
  shell.receiveShadow = false;
  group.add(shell);
  if (!LITE) {
    outlineHull(shell, 1.035);
  }

  /* Four motors, seen down the throat of each duct. A 0802 is 8 mm across. */
  const bellGeo = new THREE.CylinderGeometry(0.0040, 0.0040, 0.0058, SEG.round);
  const bells = [];
  for (const m of motors) {
    bells.push(bake(bellGeo, m.x, ROTOR_Y - 0.0028, m.z));
  }
  group.add(new THREE.Mesh(mergeParts(bells), mouldLow));

  /*
   * The stack, and the camera, which is the only tall thing on the machine.
   * The cage carries the one sakura line on the aircraft: a pilot who
   * switched from the five inch is looking at the same furniture.
   */
  const fc = new THREE.Mesh(new THREE.BoxGeometry(0.0255, 0.0026, 0.0255), board);
  fc.position.set(0, 0.0042, 0.0010);
  group.add(fc);

  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.0122, 0.0122, 0.0090), dark);
  cage.position.set(0, WHOOP_MOUNT_UP - 0.0008, -WHOOP_MOUNT_FORWARD + 0.0040);
  cage.rotation.x = -THREE.MathUtils.degToRad(WHOOP_CAM_TILT_DEG);
  group.add(cage);
  if (!LITE) {
    outlineHull(cage, 1.09);
  }
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.0128, 0.0016, 0.0092), trim);
  band.position.set(0, 0.0044, 0);
  cage.add(band);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0032, 0.0036, 0.0022, SEG.round), dark,
  );
  lens.rotation.x = Math.PI * 0.5;
  lens.position.set(0, 0, -0.0052);
  cage.add(lens);

  /* The pack, under the belly, and it is the lowest thing on the aircraft:
   * plant.c measures the whoop's 10 mm of hull down to this face. */
  const cell = new THREE.Mesh(new THREE.BoxGeometry(0.0180, 0.0064, 0.0310), pack);
  cell.position.set(0, -0.0068, 0.0020);
  group.add(cell);
  if (!LITE) {
    outlineHull(cell, 1.06);
  }

  /*
   * The lamps. Two at the back, mint, and they are the only emissive thing
   * on the machine. Basic rather than cel: a surface that glows is a light,
   * not a shaded material, and shading it just makes it dirty.
   */
  const leds = [];
  const ledGeo = new THREE.BoxGeometry(0.0042, 0.0018, 0.0014);
  for (const dx of [-0.0090, 0.0090]) {
    const mat = new THREE.MeshBasicMaterial({ color: P.mint, fog: true });
    const led = new THREE.Mesh(ledGeo, mat);
    led.position.set(dx, 0.0038, 0.0150);
    group.add(led);
    leds.push({ mat, base: new THREE.Color(P.mint) });
  }

  /*
   * The rotors. Three blades each, and they are modelled at the real 31 mm
   * because a prop drawn 2 mm oversize on this aircraft is a prop rubbing
   * the duct.
   */
  const blade = bladeGeometry(LITE ? 6 : 10);
  const rotorGeo = mergeParts([0, 1, 2].map(
    (b) => bake(blade, 0, 0, 0, -Math.PI * 0.5, (b * Math.PI * 2) / 3, 0),
  ));
  const discTex = discTexture();
  const rotors = [];
  const discs = [];
  for (let i = 0; i < 4; i += 1) {
    const rotor = new THREE.Mesh(rotorGeo, bladeMat);
    rotor.position.set(motors[i].x, ROTOR_Y, motors[i].z);
    group.add(rotor);
    rotors.push(rotor);

    const disc = new THREE.Mesh(
      new THREE.PlaneGeometry(WHOOP_PROP_R * 2, WHOOP_PROP_R * 2),
      new THREE.MeshBasicMaterial({
        map: discTex, transparent: true, opacity: 0, depthWrite: false, fog: true,
      }),
    );
    disc.rotation.x = -Math.PI * 0.5;
    disc.position.set(motors[i].x, ROTOR_Y + 0.0006, motors[i].z);
    disc.visible = false;
    group.add(disc);
    discs.push(disc);
  }

  let spinPhase = 0;
  /*
   * Faster than the five inch's, because it IS faster: a 0802 on 1S turns
   * about forty thousand, against a 2207's twenty five. The number below is
   * radians of drawn rotation rather than real rpm, chosen so the blades
   * blur out at the same throttle the disc arrives at and the two hand over
   * without a frame of both.
   */
  function spin(dt, throttle) {
    spinPhase += dt * throttle * 380;
    const blurred = throttle > 0.34;
    for (let m = 0; m < 4; m += 1) {
      rotors[m].rotation.y = spinPhase * PROP_SPIN[m];
      rotors[m].visible = !blurred;
      discs[m].visible = throttle > 0.24;
      if (discs[m].visible) {
        discs[m].material.opacity = Math.min(0.90, Math.max(0, (throttle - 0.24) * 2.2));
      }
    }
  }

  /* Dim until there is a pack in it. Same contract as drone.js. */
  function setArmed(on) {
    for (const l of leds) {
      l.mat.color.copy(l.base).multiplyScalar(on ? 1 : 0.22);
    }
  }
  setArmed(false);

  return { group, spin, setArmed };
}

/*
 * Merge without pulling in BufferGeometryUtils.
 *
 * The addon is one more CDN request on a page whose whole boot budget is
 * three files, and all that is wanted here is a concatenation of position,
 * normal and uv from geometries that already share a material. Everything
 * this builds is non indexed after toNonIndexed, so the merge is three
 * typed array copies and no index arithmetic.
 */
function mergeParts(parts) {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of flat) {
    total += g.attributes.position.count;
  }
  const pos = new Float32Array(total * 3);
  const nrm = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let at = 0;
  for (const g of flat) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array.subarray(0, n * 3), at * 3);
    if (g.attributes.normal) {
      nrm.set(g.attributes.normal.array.subarray(0, n * 3), at * 3);
    }
    if (g.attributes.uv) {
      uv.set(g.attributes.uv.array.subarray(0, n * 2), at * 2);
    }
    at += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}
