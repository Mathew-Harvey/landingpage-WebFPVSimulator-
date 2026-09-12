/*
 * room.js: the shed, and the micro track standing in it.
 *
 * The last place the film goes, and the smallest. Everything before it is
 * outdoors and measured in tens of metres: a 51 m race field and a town 460 m
 * from it. This is ten metres by twelve with a four metre ceiling, and the
 * track standing in it is a few metres across. The whole act is that change
 * of scale, so nothing here is drawn a size that would make it easier to see.
 *
 * WHICH track is not this file's business. It builds whatever room-data.js
 * holds: a gate at every position in GATES, a stack wherever two of them
 * share one, a flat one for every entry in DIVES, and legs under whatever is
 * left unsupported. Changing the demo track is a regeneration of that file
 * and nothing here moves.
 *
 * IT IS THE SIMULATOR'S ROOM, NOT A ROOM. The dimensions and every colour
 * below are lifted from WebFPVSimulator/src/render/scene.js, which builds the
 * same shed for a micro track, and the geometry follows its recipe member for
 * member: uprights whose inner faces are the opening, a cross member above
 * every opening and below only the ones that are off the floor, a moulded
 * corner at each junction, stub feet, and no printing of any kind, because a
 * RaceGOW gate is bare white pipe. A visitor who clicks through from this act
 * lands in this room, and the two should not disagree about what it looks
 * like.
 *
 * WHY IT IS A SHED AND NOT A LIVING ROOM. RaceGOW's rules specify the
 * envelope and say pilots "will need some additional space around the outside
 * of that to fly the tracks optimally", and nothing else: the room is not part
 * of the spec. The simulator settled on 10 by 12 by 4 after its owner flew the
 * 5 by 6 by 2.4 version and asked for twice the room, because at 5 by 6 the
 * aircraft is never more than two and a half metres from a wall and the whole
 * lap is spent defending the boundary. This is a shed, a hall or a warehouse
 * bay, which is where organised whoop racing goes once it leaves the sofa.
 *
 * WHERE THE NUMBERS COME FROM. The track is generated: see room-data.js and
 * scripts/bake-room.js. Nothing about the layout is authored here. What is
 * authored here is the shed, the lamps and the furniture, which the simulator
 * has its own versions of and which no data file owns.
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
import { celMaterial } from './cel.js';
import { LITE, SEG } from './quality.js';
import {
  DIVES, GATES, LINE_MM, OPENING, PADS, PIPE_OD, POLES, RAILS,
} from './room-data.js';

/*
 * WHERE THE SHED STANDS, and it is nowhere near anything.
 *
 * The room act draws the room and nothing else: the field's group and the
 * town's are both switched off for the whole of it, so in principle this
 * could sit on the origin. It does not, because "in principle nothing else is
 * there" is a claim that stops being true the first time somebody forgets to
 * hide something, and the failure mode is a race gate standing in a shed.
 * 300 m south of the field is far enough that a mistake shows up as an empty
 * frame rather than as a haunting.
 */
export const ROOM_ORIGIN = new THREE.Vector3(0, 0, 300);

/* The shed, in metres. src/trackbuilder/racegow.js owns these three. */
export const ROOM = { width: 10, depth: 12, height: 4 };

/*
 * The palette, from the simulator's own ROOM block.
 *
 * THE FLOOR IS THE DARKEST THING IN THE PICTURE ON PURPOSE. RaceGOW pilots
 * write about this: white pipe on a pale floor is unflyable, and the mat is
 * what makes a white gate read at all. Everything else is a pine board shed
 * lit by two warm bulbs, which is what every build video on the series looks
 * like.
 */
const PAL = {
  air: 0x14100c,
  floor: 0x1c1c1e,
  floorEdge: 0x3a352e,
  wall: 0x6b5335,
  wallLow: 0x4a3a26,
  ceiling: 0x3d3128,
  joist: 0x59462e,
  skirt: 0x2a2118,
  pipe: 0xe6e3da,
  fitting: 0xcfcabd,
  steel: 0x6d7076,
  bench: 0x7a6242,
  bulb: 0xffdaa4,
};

/* The air of an unlit shed. main.js hands this to the stage, which is why it
 * is exported rather than kept private: the fog, the background and the
 * clear colour indoors are all this one number. */
export const ROOM_AIR = PAL.air;

/* Half a pipe, and where an upright's centre sits: the INNER faces of the two
 * uprights are the opening, so each centre is half a tube outboard of it. */
const TUBE_R = PIPE_OD * 0.5;
const UP_X = OPENING * 0.5 + TUBE_R;
/* A cross member overhangs its uprights by two tube radii at each end, which
 * is the stub a three way fitting leaves. */
const MEMBER_LEN = OPENING + 4 * TUBE_R;
const FITTING = TUBE_R * 2.9;

/* The gate's width axis for a given yaw. A structure with yaw t faces along
 * (sin t, 0, cos t), so its opening spans the perpendicular. Getting this
 * backwards puts every gate on the track at right angles to the line, which
 * is at least an obvious failure. */
function sideAxis(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

/*
 * The line, in world coordinates.
 *
 * A closed centripetal CatmullRom through the baked knots, the same curve
 * type course.js fits to the race line, so the two acts are flown by the same
 * kind of thing. Offset by the room's origin here rather than in the data,
 * because the data is the track and the origin is where this page happens to
 * have put the shed.
 */
function roomLine(origin) {
  const pts = [];
  for (let i = 0; i < LINE_MM.length; i += 3) {
    pts.push(new THREE.Vector3(
      origin.x + LINE_MM[i] / 1000,
      origin.y + LINE_MM[i + 1] / 1000,
      origin.z + LINE_MM[i + 2] / 1000,
    ));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
}

/*
 * Every vertical pipe on the track, gathered before anything is drawn.
 *
 * Two gates side by side SHARE an upright, and the far side pair on this
 * track does exactly that: their inner stiles land 1.2 mm apart, which is the
 * rounding in the data file and not two pipes. Drawn twice they z fight down
 * their whole length. So the uprights are collected, merged when they are
 * within 6 mm of each other, and the tallest wins.
 *
 * SIX MILLIMETRES AND NOT FIFTY. A RaceGOW pole stands half an inch inboard
 * of the stile it marks, which is 13 mm, and there are three of those on this
 * track. A generous threshold would eat all three and the track would lose
 * its markers.
 */
function uprights() {
  const posts = [];
  const put = (x, z, top, r, kind) => {
    for (const p of posts) {
      if (Math.hypot(p.x - x, p.z - z) < 0.006) {
        p.top = Math.max(p.top, top);
        p.r = Math.max(p.r, r);
        return;
      }
    }
    posts.push({ x, z, top, r, kind });
  };

  for (const g of GATES) {
    const s = sideAxis(g.yaw);
    /* Just above the topmost cross member, which is what makes a stack read
     * as a tower rather than as two floating hoops. */
    const top = g.sill + OPENING + 2 * TUBE_R;
    put(g.x + s.x * UP_X, g.z + s.z * UP_X, top, TUBE_R, 'gate');
    put(g.x - s.x * UP_X, g.z - s.z * UP_X, top, TUBE_R, 'gate');
  }
  for (const p of POLES) {
    put(p.x, p.z, p.h, p.r, 'pole');
  }
  /*
   * A LEG UNDER EVERY UNSUPPORTED RAIL END, and this is the one piece of the
   * track that is a reconstruction rather than a reading.
   *
   * The rail is two lengths of the same pipe at one unit up, and half the
   * lap's character is in it: the line goes under it on the way out and over
   * it on the way back. Its west end tees straight into the start gate's
   * stile, which is in the data. Its east end and the joint between the two
   * lengths are in mid air, because the document records apertures and
   * markers rather than the plumbing that holds them up. Something holds them
   * up in the room, so something holds them up here.
   *
   * The threshold is 30 mm: a rail end that lands on a stile already has its
   * post, and the two that do not each get one. Measured, the nearest the
   * flown line comes to either is 295 mm, against a 41 mm aircraft.
   */
  for (const r of RAILS) {
    const s = sideAxis(r.yaw);
    for (const end of [-1, 1]) {
      const x = r.x + s.x * r.w * 0.5 * end;
      const z = r.z + s.z * r.w * 0.5 * end;
      if (!posts.some((p) => Math.hypot(p.x - x, p.z - z) < 0.03)) {
        posts.push({ x, z, top: r.y, r: TUBE_R, kind: 'leg' });
      }
    }
  }
  return posts;
}

/*
 * One length of pipe between two points at a height.
 *
 * Aimed with a quaternion rather than with two Euler terms, and that is not
 * fussiness. A cylinder is built along Y; laying it down about Z and then
 * turning it about Y is the wrong order for Three's default XYZ Euler, which
 * applies the Y term to a cylinder that is still standing up. The bug it
 * produces is a member that is in the right place, the right length, and
 * pointing somewhere else.
 */
const BAR_UP = new THREE.Vector3(0, 1, 0);
const barDir = new THREE.Vector3();
function bar(mat, ax, az, bx, bz, y, r) {
  const len = Math.hypot(bx - ax, bz - az);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, SEG.tube), mat);
  mesh.position.set((ax + bx) * 0.5, y, (az + bz) * 0.5);
  barDir.set(bx - ax, 0, bz - az).normalize();
  mesh.quaternion.setFromUnitVectors(BAR_UP, barDir);
  mesh.castShadow = !LITE;
  return mesh;
}

export function buildRoom() {
  const group = new THREE.Group();
  group.name = 'room';
  group.position.copy(ROOM_ORIGIN);

  const halfW = ROOM.width * 0.5;
  const halfD = ROOM.depth * 0.5;
  const H = ROOM.height;
  const T = 0.10;

  const wallMat = celMaterial({ color: PAL.wall, rim: 0.16, spec: 0.06 });
  const wallLowMat = celMaterial({ color: PAL.wallLow, rim: 0.12, spec: 0.04 });
  const ceilMat = celMaterial({ color: PAL.ceiling, rim: 0.10, spec: 0.03 });
  const joistMat = celMaterial({ color: PAL.joist, rim: 0.14, spec: 0.05 });
  const skirtMat = celMaterial({ color: PAL.skirt, rim: 0.18, spec: 0.10 });
  const matMat = celMaterial({ color: PAL.floor, rim: 0.10, spec: 0.05 });
  const edgeMat = celMaterial({ color: PAL.floorEdge, rim: 0.08, spec: 0.03 });
  const pipeMat = celMaterial({ color: PAL.pipe, rim: 0.34, spec: 0.34 });
  const fittingMat = celMaterial({ color: PAL.fitting, rim: 0.26, spec: 0.20 });
  const steelMat = celMaterial({ color: PAL.steel, rim: 0.30, spec: 0.40 });
  const benchMat = celMaterial({ color: PAL.bench, rim: 0.20, spec: 0.10 });
  const boxMat = celMaterial({ color: 0x2a2f36, rim: 0.22, spec: 0.12 });

  /*
   * The slab and the mat, four and eight millimetres up, so the two planes
   * cannot fight each other. The slab runs well past the walls: nothing
   * should ever see under a skirting board, and a floor that stops at one
   * shows a hairline of nothing at every corner.
   */
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width + 6, ROOM.depth + 6), edgeMat,
  );
  slab.rotation.x = -Math.PI * 0.5;
  slab.position.y = 0.004;
  slab.receiveShadow = !LITE;
  group.add(slab);

  const mat = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 8.4), matMat);
  mat.rotation.x = -Math.PI * 0.5;
  mat.position.set(0, 0.008, -0.2);
  mat.receiveShadow = !LITE;
  group.add(mat);

  /*
   * Four walls, a dado band and a skirting. The band is what stops a four
   * metre wall reading as a backdrop: a room has a line round it at the
   * height a room's furniture is, and without one there is nothing in the
   * frame to say how big the wall is.
   */
  /* Each wall as its centre, its span and the way it faces INTO the room, so
   * the band and the skirting can be hung a few millimetres proud of it
   * without four special cases. */
  const BAND = 1.15;
  const walls = [
    { x: 0, z: -halfD - T * 0.5, w: ROOM.width + T * 2, d: T, nx: 0, nz: 1 },
    { x: 0, z: halfD + T * 0.5, w: ROOM.width + T * 2, d: T, nx: 0, nz: -1 },
    { x: -halfW - T * 0.5, z: 0, w: T, d: ROOM.depth, nx: 1, nz: 0 },
    { x: halfW + T * 0.5, z: 0, w: T, d: ROOM.depth, nx: -1, nz: 0 },
  ];
  for (const w of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w.w, H, w.d), wallMat);
    wall.position.set(w.x, H * 0.5, w.z);
    wall.receiveShadow = !LITE;
    group.add(wall);

    /*
     * Trimmed 20 mm short along the wall so two of these meeting at a corner
     * do not intersect and z fight down the join.
     *
     * `along` is the wall's length and `face` is its thickness, and which of
     * w.w and w.d is which depends on the wall. Getting that backwards puts
     * the band six metres inboard of the wall it belongs to, which is not a
     * subtle bug: it is a two metre partition standing diagonally across the
     * room with the track behind it.
     */
    const along = (w.nx ? w.d : w.w) - 0.02;
    const face = w.nx ? w.w : w.d;
    for (const [h, thick, m] of [[BAND, 0.014, wallLowMat], [0.13, 0.030, skirtMat]]) {
      const piece = new THREE.Mesh(
        new THREE.BoxGeometry(w.nx ? thick : along, h, w.nx ? along : thick), m,
      );
      piece.position.set(
        w.x + w.nx * (face * 0.5 + thick * 0.5),
        h * 0.5,
        w.z + w.nz * (face * 0.5 + thick * 0.5),
      );
      group.add(piece);
    }
  }

  /*
   * The lid and the joists under it. Counted from the room at a fixed
   * spacing rather than a fixed number, and 140 mm deep, because a 75 mm
   * joist over a ten metre clear span is a thing that would be on the floor.
   */
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width + T * 2, T, ROOM.depth + T * 2), ceilMat,
  );
  ceil.position.set(0, H + T * 0.5, 0);
  group.add(ceil);

  const purlins = Math.max(3, Math.round(ROOM.depth / 0.9));
  const purlinGeo = new THREE.BoxGeometry(ROOM.width, 0.14, 0.055);
  for (let i = 0; i < purlins; i += 1) {
    const joist = new THREE.Mesh(purlinGeo, joistMat);
    joist.position.set(0, H - 0.07, -halfD + (i + 0.5) * (ROOM.depth / purlins));
    group.add(joist);
  }

  /*
   * TWO WARM BULBS, and they are the act's only light.
   *
   * One over the middle is right for a domestic room. In a hall four metres
   * high the far corner is nine metres from a single lamp, and with the 1.7
   * decay a real bulb has that corner falls to a tenth of the middle: a black
   * shed with a lit patch in it. Two down the long axis overlap in the middle
   * and reach both ends, which is what a two lamp shed actually looks like.
   *
   * They are NOT in the group above. A light inside a hidden subtree leaves
   * the renderer's lighting state when the subtree goes, and every material
   * on the page recompiles the moment it comes back. These live in the scene
   * for the whole visit and are turned down to nothing instead: see setLamps.
   */
  const lamps = new THREE.Group();
  lamps.name = 'room-lamps';
  lamps.position.copy(ROOM_ORIGIN);
  const bulbs = [];
  const glows = [];
  for (const lz of [-ROOM.depth * 0.25, ROOM.depth * 0.25]) {
    /*
     * ON A LONG FLEX, 700 mm down, which is a fix rather than decoration.
     *
     * The simulator hangs its lamps 250 mm under the ceiling, which is right
     * for a scene nothing ever looks up in. This act looks straight up: a
     * whoop's lens is tilted 25 degrees back and the aircraft climbs to 2.5 m
     * over the tower, so the ceiling is in frame for a good part of the lap.
     * At 250 mm the boards immediately around a lamp take 42 over 0.25 to
     * the 1.7, which is four hundred: a white hole in the roof with the
     * joists dissolving into it. Dropping the lamp trades that for a lit
     * cone on the ceiling, which is what a bare bulb in a shed does.
     */
    const bulb = new THREE.PointLight(PAL.bulb, 0, ROOM.depth * 2.5, 1.45);
    bulb.position.set(0, H - 0.78, lz);
    bulb.castShadow = false;
    lamps.add(bulb);
    bulbs.push(bulb);

    /* The fitting: a flex down from the joists, a shade, and the glass. The
     * glass is basic rather than cel, because a surface that glows is a
     * light and shading one just makes it dirty. */
    const flex = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.62, 5), skirtMat,
    );
    flex.position.set(0, H - 0.31, lz);
    group.add(flex);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.17, 0.13, SEG.round, 1, true), steelMat,
    );
    shade.material.side = THREE.DoubleSide;
    shade.position.set(0, H - 0.68, lz);
    group.add(shade);
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, SEG.round, 8),
      new THREE.MeshBasicMaterial({ color: PAL.bulb, fog: false }),
    );
    glass.position.set(0, H - 0.775, lz);
    group.add(glass);
    glows.push(glass.material);
  }

  /*
   * The bounce. Cool from the ceiling, warm off the boards, and it is the
   * only thing lighting the corners at all: a point light with a real decay
   * has nothing left to give at nine metres.
   */
  const bounce = new THREE.HemisphereLight(0xc9d6e8, 0x2a2420, 0);
  bounce.position.set(0, H, 0);
  lamps.add(bounce);

  /* --------------------------------------------------------------- the track */

  const track = new THREE.Group();
  track.name = 'racegow';
  group.add(track);

  for (const p of uprights()) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(p.r, p.r, p.top, SEG.tube), pipeMat,
    );
    post.position.set(p.x, p.top * 0.5, p.z);
    post.castShadow = !LITE;
    track.add(post);
    /*
     * NO INK LINE ON A POST, and that is a fix rather than an omission.
     *
     * outlineHull scales a mesh about its own bounding box centre, so on a
     * 2.2 m cylinder 27 mm across a five percent hull is 55 mm proud at each
     * END and 0.7 mm at the sides: a black disc on top of every pole and
     * nothing down its length. cel.js says as much, that elongated parts
     * take a smaller factor, and the factor a pipe would need is smaller
     * than the line is worth. White pipe against a dark mat separates
     * without help.
     */
    /*
     * A stub foot, in line with the frame. A MultiGP gate's base is 0.34 by
     * 0.62 m, which on a RaceGOW gate would be longer than the opening is
     * wide, and it would not be there anyway: the corners are three way
     * fittings with short stub feet lying flat, which is what is in every
     * photograph of one.
     */
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(TUBE_R * 4, TUBE_R * 1.6, TUBE_R * 4), fittingMat,
    );
    foot.position.set(p.x, TUBE_R * 0.8, p.z);
    track.add(foot);
  }

  /*
   * Cross members: one above every opening, and one below the lowest opening
   * ONLY when that opening is off the floor. A gate standing on the ground
   * has the ground as its sill, which is how the opening is measured, and a
   * bar across the bottom of one would be a bar buried in the mat.
   */
  const fittings = [];
  for (const g of GATES) {
    const s = sideAxis(g.yaw);
    const half = MEMBER_LEN * 0.5;
    const put = (y) => {
      track.add(bar(pipeMat,
        g.x - s.x * half, g.z - s.z * half,
        g.x + s.x * half, g.z + s.z * half, y, TUBE_R));
      for (const e of [-1, 1]) {
        fittings.push({ x: g.x + s.x * UP_X * e, y, z: g.z + s.z * UP_X * e });
      }
    };
    put(g.sill + OPENING + TUBE_R);
    if (g.sill > 0) {
      put(g.sill - TUBE_R);
    } else {
      /* The corner still exists at the foot of a ground gate, it just has no
       * bar through it. Sat at the sill it would be half under the floor, so
       * it rests ON the floor, which is where the fitting on a real one is. */
      for (const e of [-1, 1]) {
        fittings.push({ x: g.x + s.x * UP_X * e, y: FITTING * 0.5, z: g.z + s.z * UP_X * e });
      }
    }
  }

  const fittingGeo = new THREE.BoxGeometry(FITTING, FITTING, FITTING * 0.92);
  const placed = [];
  for (const f of fittings) {
    if (placed.some((q) => Math.hypot(q.x - f.x, q.y - f.y, q.z - f.z) < 0.008)) {
      continue;
    }
    placed.push(f);
    const cube = new THREE.Mesh(fittingGeo, fittingMat);
    cube.position.set(f.x, f.y, f.z);
    track.add(cube);
  }

  /*
   * The horizontal gate: the same 28 inch square laid flat and flown down
   * through. RaceGOW calls it a Horizontal Gate and everybody else calls it
   * the table top. Four members and four corners, and the uprights that hold
   * it up are the legs added by uprights() above.
   */
  for (const d of DIVES) {
    const s = sideAxis(d.yaw);
    const f = { x: -s.z, z: s.x };
    const half = OPENING * 0.5 + TUBE_R;
    for (const e of [-1, 1]) {
      track.add(bar(pipeMat,
        d.x + f.x * half * e - s.x * half, d.z + f.z * half * e - s.z * half,
        d.x + f.x * half * e + s.x * half, d.z + f.z * half * e + s.z * half,
        d.sill, TUBE_R));
      track.add(bar(pipeMat,
        d.x + s.x * half * e - f.x * half, d.z + s.z * half * e - f.z * half,
        d.x + s.x * half * e + f.x * half, d.z + s.z * half * e + f.z * half,
        d.sill, TUBE_R));
    }
    for (const ex of [-1, 1]) {
      for (const ez of [-1, 1]) {
        const cx = d.x + s.x * half * ex + f.x * half * ez;
        const cz = d.z + s.z * half * ex + f.z * half * ez;
        const cube = new THREE.Mesh(fittingGeo, fittingMat);
        cube.position.set(cx, d.sill, cz);
        track.add(cube);
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(TUBE_R, TUBE_R, d.sill, SEG.tube), pipeMat,
        );
        leg.position.set(cx, d.sill * 0.5, cz);
        track.add(leg);
      }
    }
  }

  /* The rail, in the two lengths the document records it as. */
  for (const r of RAILS) {
    const s = sideAxis(r.yaw);
    track.add(bar(pipeMat,
      r.x - s.x * r.w * 0.5, r.z - s.z * r.w * 0.5,
      r.x + s.x * r.w * 0.5, r.z + s.z * r.w * 0.5, r.y, TUBE_R));
  }

  /* The pad. One hundred millimetres square, which is bigger than the
   * aircraft that sits on it. */
  for (const p of PADS) {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(p.size * 1.6, 0.004, p.size * 1.6),
      celMaterial({ color: 0x8f9aa4, rim: 0.24, spec: 0.20 }),
    );
    pad.position.set(p.x, 0.012, p.z);
    track.add(pad);
  }

  /* ----------------------------------------------------------- the furniture */

  /*
   * A bench with the pilot's kit on it, and a chair.
   *
   * Four boxes and a claim, and the claim is the point of the act: somebody
   * flies here on their own. A shed with nothing in it but a track is a
   * render of a track; a shed with a charger on a bench and one chair pulled
   * out is a place a person goes. Well clear of the track, which reaches
   * 1.63 m from the middle of the room in x and 1.18 in z.
   */
  const kit = new THREE.Group();
  /* In the far corner beyond the track rather than beside the camera. The
   * act's opening shot comes in over the near left corner, and a trestle
   * table a metre from the lens is a brown rectangle across a third of the
   * establishing frame. Across the room it is what it is meant to be:
   * something in the background that says a person uses this place. */
  kit.position.set(3.3, 0, -4.2);
  kit.rotation.y = 0.42;
  group.add(kit);

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.035, 0.70), benchMat);
  top.position.y = 0.74;
  kit.add(top);
  for (const dx of [-0.76, 0.76]) {
    for (const dz of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.74, 0.045), steelMat);
      leg.position.set(dx, 0.37, dz);
      kit.add(leg);
    }
  }
  /* A charger, a lipo bag and a pair of goggles on their side. */
  const charger = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.11, 0.15), boxMat);
  charger.position.set(-0.52, 0.813, 0.02);
  kit.add(charger);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.09, 0.22), skirtMat);
  bag.position.set(-0.05, 0.803, -0.04);
  kit.add(bag);
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.11), boxMat);
  goggles.position.set(0.46, 0.803, 0.05);
  goggles.rotation.y = -0.4;
  kit.add(goggles);
  const packsGeo = new THREE.BoxGeometry(0.032, 0.012, 0.058);
  for (let i = 0; i < 5; i += 1) {
    const cell = new THREE.Mesh(packsGeo, celMaterial({ color: 0x3c4450, rim: 0.24 }));
    cell.position.set(0.16 + (i % 3) * 0.045, 0.7635, -0.16 + Math.floor(i / 3) * 0.07);
    kit.add(cell);
  }

  const chair = new THREE.Group();
  chair.position.set(2.2, 0, -3.35);
  chair.rotation.y = -0.55;
  group.add(chair);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.40), benchMat);
  seat.position.y = 0.45;
  chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.03), benchMat);
  back.position.set(0, 0.66, -0.185);
  chair.add(back);
  for (const dx of [-0.18, 0.18]) {
    for (const dz of [-0.17, 0.17]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.45, 0.026), steelMat);
      leg.position.set(dx, 0.225, dz);
      chair.add(leg);
    }
  }

  /*
   * THE REST OF THE SHED, and it earns its place by fixing a shot rather
   * than by dressing a set.
   *
   * The track is 3.25 m by 2.28 in a room 10 by 12. Flown from inside, most
   * of what is in frame for most of the lap is therefore NOT the track: it
   * is whatever is across the room, and with four bare walls that was four
   * bare walls. Every frame of the lap looked like the same frame, and the
   * aircraft read as hovering in a brown box rather than as flying through
   * somewhere.
   *
   * So the walls get what a shed's walls have on them. None of it is near
   * the track, none of it is in the flight path, and none of it is more than
   * a box: what it buys is that every heading out of a corner has something
   * different at the end of it, which is the only thing that tells a pilot,
   * and a reader, which way round the room they are.
   */
  const clutter = new THREE.Group();
  group.add(clutter);
  const put = (geo, mtl, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mtl);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = !LITE;
    clutter.add(m);
    return m;
  };

  /* A roller shutter on the long wall, which is the one thing that says shed
   * rather than spare room. Corrugated as a run of narrow slats, because a
   * flat panel three metres across is a hole in the wall. */
  const shutterMat = celMaterial({ color: 0x5a6167, rim: 0.20, spec: 0.24 });
  const slatGeo = new THREE.BoxGeometry(0.05, 0.155, 3.0);
  for (let i = 0; i < 17; i += 1) {
    put(slatGeo, shutterMat, halfW - 0.055, 0.09 + i * 0.16, -1.4);
  }
  put(new THREE.BoxGeometry(0.09, 0.10, 3.24), steelMat, halfW - 0.06, 2.83, -1.4);

  /* Shelving against the short wall, with what is on shelving. */
  const shelf = new THREE.Group();
  shelf.position.set(-halfW + 0.30, 0, -2.4);
  shelf.rotation.y = Math.PI * 0.5;
  clutter.add(shelf);
  for (let i = 0; i < 4; i += 1) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.032, 0.44), benchMat);
    board.position.set(0, 0.42 + i * 0.52, 0);
    shelf.add(board);
  }
  for (const dx of [-1.02, 1.02]) {
    const stile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.98, 0.44), steelMat);
    stile.position.set(dx, 0.99, 0);
    shelf.add(stile);
  }
  /* Boxes on it. Deterministic rather than random: a page whose furniture
   * moves between reloads is a page whose screenshots cannot be compared. */
  const BOXES = [
    [-0.78, 0, 0.36, 0.26, 0.30], [-0.40, 0, 0.30, 0.22, 0.28],
    [0.34, 0, 0.44, 0.30, 0.32], [-0.62, 1, 0.40, 0.24, 0.30],
    [0.10, 1, 0.34, 0.30, 0.28], [0.62, 1, 0.28, 0.20, 0.26],
    [-0.30, 2, 0.46, 0.28, 0.30], [0.48, 2, 0.32, 0.22, 0.28],
    [-0.84, 3, 0.30, 0.24, 0.26], [0.20, 3, 0.42, 0.26, 0.30],
  ];
  for (const [dx, tier, w, h, d] of BOXES) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat);
    box.position.set(dx, 0.436 + tier * 0.52 + h * 0.5, 0);
    shelf.add(box);
  }

  /* A stack of crates in the far corner, and a ladder along the wall beside
   * it, both leaning the way things in a shed lean. */
  const crateMat = celMaterial({ color: 0x5c4a30, rim: 0.20, spec: 0.08 });
  for (let i = 0; i < 3; i += 1) {
    put(new THREE.BoxGeometry(0.62, 0.42, 0.46), crateMat,
      -halfW + 0.75 + i * 0.04, 0.21 + i * 0.42, 1.9, 0.06 * i);
  }
  const ladder = new THREE.Group();
  ladder.position.set(-halfW + 0.42, 0, 4.1);
  ladder.rotation.z = -0.075;
  clutter.add(ladder);
  for (const dz of [-0.19, 0.19]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.6, 0.035), steelMat);
    rail.position.set(0, 1.3, dz);
    ladder.add(rail);
  }
  for (let i = 0; i < 8; i += 1) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.028, 0.38), steelMat);
    rung.position.set(0, 0.24 + i * 0.31, 0);
    ladder.add(rung);
  }

  /*
   * The fourth wall, which had nothing on it and was the reason a third of
   * the lap had nothing in frame.
   *
   * A pegboard with tools on it, a clock, and a coil of hose. All four walls
   * carry something now, which is the actual requirement: an aircraft above
   * head height in the middle of this room has only a wall in front of it,
   * and if every wall is the same wall then every one of those frames is the
   * same frame.
   */
  const pegMat = celMaterial({ color: 0x4a4034, rim: 0.16, spec: 0.06 });
  put(new THREE.BoxGeometry(2.4, 1.15, 0.03), pegMat, 1.1, 1.85, halfD - 0.06);
  const TOOLS = [
    [-0.95, 0.30, 0.055, 0.52], [-0.72, 0.10, 0.045, 0.34], [-0.50, 0.22, 0.05, 0.44],
    [0.32, 0.24, 0.07, 0.30], [0.55, 0.06, 0.16, 0.09], [0.86, 0.20, 0.05, 0.40],
  ];
  for (const [dx, dy, w, h] of TOOLS) {
    put(new THREE.BoxGeometry(w, h, 0.03), steelMat, 1.1 + dx, 1.85 + dy, halfD - 0.085);
  }
  const clock = put(new THREE.CylinderGeometry(0.13, 0.13, 0.035, SEG.round),
    celMaterial({ color: 0xe4e0d6, rim: 0.24, spec: 0.20 }), -1.9, 2.72, halfD - 0.07);
  clock.rotation.x = Math.PI * 0.5;
  const hose = put(new THREE.TorusGeometry(0.24, 0.055, 6, SEG.round),
    celMaterial({ color: 0x2f4a3a, rim: 0.18 }), 3.2, 1.05, halfD - 0.14);
  hose.rotation.y = Math.PI * 0.5;

  /* And a stack of totes beside the shutter, so that wall is not one flat
   * shutter and four metres of board. */
  const toteMat = celMaterial({ color: 0x3d5568, rim: 0.22, spec: 0.14 });
  for (let i = 0; i < 4; i += 1) {
    put(new THREE.BoxGeometry(0.52, 0.34, 0.72), toteMat,
      halfW - 0.42, 0.17 + i * 0.34, 1.55, 0.03 * i);
  }

  /*
   * Two banners on the boards. Flat colour rather than print, and that is
   * the honest version rather than a shortcut: a sponsor's mark belongs to
   * the sponsor, and a made up one on a page that is otherwise careful about
   * whose work is whose would be worse than a rectangle. What the rectangle
   * has to do is give a wall a colour that is not the wall's, so a pilot
   * coming round the tower knows which end of the room they are pointing at.
   */
  put(new THREE.BoxGeometry(0.02, 0.82, 2.3),
    celMaterial({ color: 0x8d4a58, rim: 0.20 }), -halfW + 0.055, 2.15, 2.3);
  put(new THREE.BoxGeometry(2.6, 0.72, 0.02),
    celMaterial({ color: 0x3f5a6b, rim: 0.20 }), 1.4, 2.25, -halfD + 0.055);

  /* A door on the near wall, so the shed has a way in. Flat panels rather
   * than a modelled frame: it is nine metres from anything the camera does
   * and it is there to be recognised, not read. */
  const door = new THREE.Group();
  /* On the far wall, so it is in the establishing shot rather than behind
   * the camera in every frame of the act. */
  door.position.set(-3.1, 0, -halfD + 0.005);
  door.rotation.y = Math.PI;
  group.add(door);
  const doorParts = [
    { geo: new THREE.BoxGeometry(1.02, 2.16, 0.03), mat: skirtMat, y: 1.08, z: 0, x: 0 },
    { geo: new THREE.BoxGeometry(0.90, 2.05, 0.04), mat: benchMat, y: 1.025, z: -0.012, x: 0 },
    { geo: new THREE.BoxGeometry(0.10, 0.03, 0.03), mat: steelMat, y: 1.02, z: -0.038, x: 0.34 },
  ];
  for (const d of doorParts) {
    const piece = new THREE.Mesh(d.geo, d.mat);
    piece.position.set(d.x, d.y, d.z);
    door.add(piece);
  }

  /* ---------------------------------------------------------------- controls */

  /*
   * THE LIGHT SWITCH, as a number between nothing and one.
   *
   * The act arrives out of black and this is what brings it up: not a fade
   * from a veil over the top of a lit room, but the room's own lamps coming
   * on, so the light lands where light lands. Two bulbs, the bounce, and the
   * glass all move together, and everything is a plain multiply, which means
   * the frame is a pure function of the parameter and the whole thing scrubs
   * backwards as cleanly as it plays forwards.
   *
   * The simulator's own figures for this room are 42 at a 1.7 decay with a
   * 0.42 bounce, and they are right for a scene nothing ever looks up in.
   * This act looks up: the boards a foot from a lamp were taking sixty times
   * what the floor was, so the ceiling burnt out to white wherever a bulb
   * was in frame and the white pipe in front of it stopped reading as white.
   * A softer decay and more bounce spends some of the lamp's contrast on
   * getting the corners of the room legible, which is what a shot from
   * inside the room needs and a shot of the track does not.
   */
  const glowBase = new THREE.Color(PAL.bulb);
  function setLamps(k) {
    const on = Math.max(0, Math.min(1, k));
    for (const b of bulbs) {
      b.intensity = 26 * on;
    }
    bounce.intensity = 0.72 * on;
    for (const g of glows) {
      /* Down to a quarter rather than to black: a cold filament is still a
       * pale object in a dark room, and a bulb that vanishes reads as a hole
       * in the shade. */
      g.color.copy(glowBase).multiplyScalar(0.25 + 0.75 * on);
    }
  }
  setLamps(0);

  function setShown(on) {
    group.visible = on;
  }
  setShown(false);

  const line = roomLine(ROOM_ORIGIN);
  const pad = PADS[0] ?? { x: 0, z: 0 };

  return {
    group,
    lamps,
    line,
    /* The middle of the room's floor, in world coordinates, which is what
     * the closing crane frames and where the shadow camera points. */
    heart: new THREE.Vector3(ROOM_ORIGIN.x, ROOM_ORIGIN.y, ROOM_ORIGIN.z),
    /* Where the aircraft sits before the run. */
    pad: new THREE.Vector3(ROOM_ORIGIN.x + pad.x, ROOM_ORIGIN.y + 0.024, ROOM_ORIGIN.z + pad.z),
    setLamps,
    setShown,
  };
}
