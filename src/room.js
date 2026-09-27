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
 * THE SAKURA ROOM, since the simulator's owner asked for one on 26 September
 * 2026: the same basement, recoloured in the brand's palette and lit as a
 * room with its lights on, with the slap pack's stickers on its walls as
 * posters and banners. The simulator's WHOOP-ROOM-PLAN.md has the owner's
 * answers. The art is the simulator's too, and not a copy of it drawn here:
 * where each piece hangs and the quads that hang it are its
 * src/art/wallart-hang.js, where each piece is in the picture is its
 * src/art/wallart-atlas.js, both copied into src/sim/ by scripts/vendor.js,
 * and the picture is its assets/wallart/atlas.webp, copied to the same path
 * here. Only the lighting of the art is this page's, because the
 * simulator's lights it with its celmat.js and this page has its own port
 * of that, src/cel.js.
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
 * has its own versions of and which no data file owns, and of those only the
 * furniture is this page's own idea: the simulator's room has none.
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
import { wallArtGeometry } from './sim/art/wallart-hang.js';
import { WALLART } from './sim/art/wallart-atlas.js';

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
/*
 * TEN BY TWELVE BY FOUR, AND THE SIMULATOR'S OWN SHED IS 34.3 BY 41.1 BY 13.7.
 *
 * Those two are the same room and the difference is units, not disagreement.
 * The simulator's whoop flies the five inch's plant now, because that is what
 * feels like flying, so it builds every micro course MICRO_SCALE times life
 * size, 3.4289, to give a five inch the space it needs. World and aircraft
 * come through the same factor, so the picture is untouched and only the
 * flight model under it differs.
 *
 * Nothing flies here. This page has no plant, so the factor buys it nothing
 * and costs it two things: the shed below is built by hand in RaceGOW's own
 * metres, and the copy QUOTES the track's measurements. So scripts/bake-room.js
 * divides the simulator's course back down on the way in and everything on
 * this page stays life size.
 *
 * A visitor clicking through from this act still lands in this room. What they
 * must not do is open both files and conclude one of them is wrong.
 */
export const ROOM = { width: 10, depth: 12, height: 4 };

/*
 * The palette, from the simulator's own ROOM block, number for number.
 *
 * THE FLOOR IS THE DARKEST THING IN THE PICTURE ON PURPOSE. RaceGOW pilots
 * write about this: white pipe on a pale floor is unflyable, and the mat is
 * what makes a gate read at all.
 *
 * THE GATE BAND STAYS DARK, and that is the rule the recolour was built
 * around. The pipe is a pale grey, and a pipe reads against anything clearly
 * darker or clearly paler than itself and against nothing of its own value.
 * So the wall is deep green from the floor to 1.2 m, the band a whoop sees a
 * gate against from racing height, and pale sakura plaster above it, where
 * the pipe reads darker than the plaster, with a sakura rail between. This
 * page's pipe was near white while the simulator's was already this grey;
 * in front of the new plaster a near white pipe would have vanished, so it
 * is the simulator's grey now, and its fittings a shade darker, as there.
 */
const PAL = {
  /* The air of the lit room, and of the room before its lights come on,
   * which is the blackout's own colour. See airAt. */
  air: 0xcfc3c6,
  dark: 0x14100c,
  /* The mat, the town's own dark rather than a neutral black, and the
   * honey boards round it. */
  floor: 0x2f2b36,
  floorEdge: 0xc6a887,
  wall: 0xeed5d6,
  wallLow: 0x27332c,
  rail: 0xe8a8b8,
  /* A cream ceiling and pale beams. */
  ceiling: 0xc9beb2,
  joist: 0xd9cabe,
  skirt: 0x1b231e,
  /* The ceiling's light panels, their frames, and the light they give: a
   * neutral warm white, a room with its lights on and not a sunset. */
  lamp: 0xfffaf2,
  lampFrame: 0xd8d0cb,
  light: 0xfff4ea,
  /* The simulator's frame and fitting, which every micro gate is built in. */
  pipe: 0x9aa2b0,
  fitting: 0x767f8f,
  steel: 0x6d7076,
  /* This page's furniture, in the floor's honey. */
  bench: 0xb89a78,
};
/* The room's rim light is warm. The default is sky blue, for a sky this room
 * does not have, and on sakura plaster it reads as a cold edge. The gates
 * keep the default, because the simulator's gates share their material with
 * the race field's and keep it too. */
const RIM = 0xffe8ec;

/*
 * WHAT THE STAGE NEEDS FROM THE ROOM, indoors: the fog's reach and the key.
 *
 * The fog is the simulator's: 5.5 to 44 m of pale air takes the far wall a
 * sixth of the way to the air and no further, which is enough to say it is
 * far. The key is the lit ceiling's, a neutral white standing almost
 * straight overhead so it lights the floor and the tops of things evenly and
 * throws no hot side across the room. It casts nothing: a key that high runs
 * down every upright of a gate, and on a machine with shadows each pipe
 * shadowed itself dark from its top to its foot, which put dark pipe in
 * front of the dark band, the one pairing this room is built to avoid. The
 * stage parks the shadow instead of turning it off, because turning it off
 * recompiles every material on the page. See aimLight in stage.js.
 */
export const ROOM_INDOOR = {
  fogNear: 5.5,
  fogFar: 44,
  key: 0.45,
  keyColor: PAL.light,
  keyDir: new THREE.Vector3(0.16, 1, 0.24).normalize(),
};

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

  const wallMat = celMaterial({ color: PAL.wall, rim: 0.16, rimColor: RIM, spec: 0.06 });
  const wallLowMat = celMaterial({ color: PAL.wallLow, rim: 0.12, rimColor: RIM, spec: 0.04 });
  const railMat = celMaterial({ color: PAL.rail, rim: 0.16, rimColor: RIM, spec: 0.10 });
  const joistMat = celMaterial({ color: PAL.joist, rim: 0.14, rimColor: RIM, spec: 0.05 });
  const skirtMat = celMaterial({ color: PAL.skirt, rim: 0.18, rimColor: RIM, spec: 0.10 });
  const matMat = celMaterial({ color: PAL.floor, rim: 0.10, rimColor: RIM, spec: 0.05 });
  const edgeMat = celMaterial({ color: PAL.floorEdge, rim: 0.08, rimColor: RIM, spec: 0.03 });
  const frameMat = celMaterial({ color: PAL.lampFrame, rim: 0.10, rimColor: RIM, spec: 0.05 });
  /*
   * THE CEILING IS PAINTED AS LIT, not lit, which is the simulator's answer
   * to four lamps a metre under it: lit, it took a hot streak over every lamp
   * that swallowed the panels and read as the brightest thing in the room,
   * which a real ceiling, lit only by what comes back off the floor, never
   * is. So it is one even cream, a step under the plaster, and the beams,
   * which are lit, and the panels, which are the light, read against it.
   *
   * Painted as lit means it does not go dark by itself when the lights go
   * off, and this act starts with them off. So setLamps paints it down with
   * them, and the panels too, which are the light and are not lit either.
   */
  const ceilMat = new THREE.MeshBasicMaterial({ color: PAL.ceiling });
  const panelMat = new THREE.MeshBasicMaterial({ color: PAL.lamp, fog: false });
  const pipeMat = celMaterial({ color: PAL.pipe, rim: 0.26 });
  const fittingMat = celMaterial({ color: PAL.fitting, rim: 0.26 });
  const steelMat = celMaterial({ color: PAL.steel, rim: 0.30, rimColor: RIM, spec: 0.40 });
  const benchMat = celMaterial({ color: PAL.bench, rim: 0.20, rimColor: RIM, spec: 0.10 });
  const boxMat = celMaterial({ color: 0x2a2f36, rim: 0.22, rimColor: RIM, spec: 0.12 });

  /*
   * The honey boards and the mat, four and eight millimetres up, so the two
   * planes cannot fight each other. The mat reaches to 200 mm from every
   * wall, as the simulator's does, so the boards are a border you see at the
   * skirting and not a floor: this page's mat used to be a smaller rug in
   * the middle of a concrete floor, which with honey boards round it would
   * have been a different room. The boards run well past the walls, because
   * a floor that stops at a skirting shows a hairline of nothing at every
   * corner.
   */
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width + 6, ROOM.depth + 6), edgeMat,
  );
  slab.rotation.x = -Math.PI * 0.5;
  slab.position.y = 0.004;
  slab.receiveShadow = !LITE;
  group.add(slab);

  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width - 0.4, ROOM.depth - 0.4), matMat,
  );
  mat.rotation.x = -Math.PI * 0.5;
  mat.position.y = 0.008;
  mat.receiveShadow = !LITE;
  group.add(mat);

  /*
   * Four walls, each the simulator's: the dark gate band to 1.2 m, a sakura
   * rail over it, pale plaster to the ceiling, and a skirting. The band and
   * the plaster are boxes the wall's full thickness; the rail and the
   * skirting are grown across the thickness, 12 and 10 mm proud of each
   * face, whichever axis that is for the wall.
   */
  const walls = [
    { x: 0, z: -halfD - T * 0.5, w: ROOM.width + T * 2, d: T },
    { x: 0, z: halfD + T * 0.5, w: ROOM.width + T * 2, d: T },
    { x: -halfW - T * 0.5, z: 0, w: T, d: ROOM.depth + T * 2 },
    { x: halfW + T * 0.5, z: 0, w: T, d: ROOM.depth + T * 2 },
  ];
  const BAND = 1.2;
  const RAIL_H = 0.06;
  const SKIRT_H = 0.08;
  const upperY = BAND + RAIL_H;
  for (const w of walls) {
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w.w, H - upperY, w.d), wallMat);
    upper.position.set(w.x, upperY + (H - upperY) * 0.5, w.z);
    upper.receiveShadow = !LITE;
    group.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(w.w, BAND, w.d), wallLowMat);
    lower.position.set(w.x, BAND * 0.5, w.z);
    lower.receiveShadow = !LITE;
    group.add(lower);
    const across = (grow) => (w.w < w.d ? [w.w + grow, w.d] : [w.w, w.d + grow]);
    const [rw, rd] = across(0.024);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, RAIL_H, rd), railMat);
    rail.position.set(w.x, BAND + RAIL_H * 0.5, w.z);
    group.add(rail);
    const [sw, sd] = across(0.02);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(sw, SKIRT_H, sd), skirtMat);
    skirt.position.set(w.x, SKIRT_H * 0.5, w.z);
    group.add(skirt);
  }

  /*
   * The ceiling and the purlins under it, counted from the room at a fixed
   * spacing and 140 mm deep, because a 75 mm joist over a ten metre clear
   * span is a thing that would be on the floor. They are what tell a pilot
   * how high they are when they are near it.
   */
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width + T * 2, T, ROOM.depth + T * 2), ceilMat,
  );
  ceil.position.set(0, H + T * 0.5, 0);
  group.add(ceil);

  const purlins = Math.max(3, Math.round(ROOM.depth / 0.9));
  const bay = ROOM.depth / purlins;
  const purlinGeo = new THREE.BoxGeometry(ROOM.width, 0.14, 0.055);
  for (let i = 0; i < purlins; i += 1) {
    const joist = new THREE.Mesh(purlinGeo, joistMat);
    joist.position.set(0, H - 0.07, -halfD + (i + 0.5) * bay);
    group.add(joist);
  }

  /*
   * THE LIGHTS YOU CAN SEE: a 1.2 by 0.3 m panel in every other bay, two
   * rows across the room a sixth of its width either side of the middle,
   * each in a pale frame flat on the ceiling between two purlins, so nothing
   * hangs lower than the purlins do. The bays are taken in pairs from both
   * ends, which keeps the rows symmetric whatever the purlin count is.
   * Twelve, as the simulator's.
   */
  const LAMP_X = ROOM.width / 6;
  const fixtureRows = [];
  for (let k = 1; k < purlins / 2; k += 2) {
    fixtureRows.push(-halfD + k * bay, halfD - k * bay);
  }
  const frameGeo = new THREE.PlaneGeometry(1.28, 0.38).rotateX(Math.PI * 0.5);
  const panelGeo = new THREE.PlaneGeometry(1.2, 0.3).rotateX(Math.PI * 0.5);
  for (const fz of fixtureRows) {
    for (const fx of [-LAMP_X, LAMP_X]) {
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(fx, H - 0.003, fz);
      group.add(frame);
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(fx, H - 0.006, fz);
      group.add(panel);
    }
  }

  /*
   * FOUR LAMPS, and they are the act's light.
   *
   * The simulator's, at its figures brought back to life size: it builds the
   * room MICRO_SCALE times bigger and lifts each lamp's intensity by that
   * factor to the 1.7, its decay, so the floor under a lamp sees what it
   * would in a real hall, and here, where nothing is scaled, that is ten.
   * On a grid a sixth of the room's width either side of the middle and a
   * quarter of its depth, which is where a RaceGOW track stands, 0.9 m under
   * the ceiling. They light the track first and the walls second.
   *
   * They are NOT in the group above. A light inside a hidden subtree leaves
   * the renderer's lighting state when the subtree goes, and every material
   * on the page recompiles the moment it comes back. These live in the scene
   * for the whole visit and are turned down to nothing instead: see setLamps.
   */
  const lamps = new THREE.Group();
  lamps.name = 'room-lamps';
  lamps.position.copy(ROOM_ORIGIN);
  const points = [];
  for (const lx of [-LAMP_X, LAMP_X]) {
    for (const lz of [-ROOM.depth * 0.25, ROOM.depth * 0.25]) {
      const lamp = new THREE.PointLight(PAL.light, 0, ROOM.depth * 2.5, 1.7);
      lamp.position.set(lx, H - 0.9, lz);
      lamp.castShadow = false;
      lamps.add(lamp);
      points.push(lamp);
    }
  }
  /* A bright ceiling above and a warm bounce off the floor below, which is
   * what lights the corners: the simulator's pair. */
  const bounce = new THREE.HemisphereLight(0xfbf6f4, 0xc8b5b8, 0);
  bounce.position.set(0, H, 0);
  lamps.add(bounce);

  /*
   * THE POSTERS AND BANNERS, from the slap pack: the simulator's twelve
   * pieces on its four walls, in one geometry and one draw. Paint, not
   * solid: nothing here stands proud of its wall by more than a rod's width.
   *
   * Lit as the plaster is, with the room's warm rim, so a print sits in the
   * room's light rather than glowing on it, and hidden until the picture has
   * decoded: a quad with no picture on it is a grey card on the wall. The
   * picture is not fetched here. Nothing is fetched at import on this page,
   * so the shed's loader job asks for it with loadArt, and warms the room
   * with the art up, which is what puts the picture on the GPU before the
   * lights come on rather than as they do.
   */
  const hung = wallArtGeometry(WALLART, { halfW, halfD, y0: 0, K: 1 });
  const artTex = new THREE.Texture();
  artTex.colorSpace = THREE.SRGBColorSpace;
  artTex.anisotropy = LITE ? 4 : 8;
  const artMat = celMaterial({
    color: 0xffffff, rim: 0.08, rimColor: RIM, spec: 0.02, transparent: true, map: artTex,
  });
  artMat.depthWrite = false;
  artMat.polygonOffset = true;
  artMat.polygonOffsetFactor = -2;
  artMat.polygonOffsetUnits = -2;
  const art = new THREE.Mesh(hung.art, artMat);
  art.name = 'wallArt';
  art.visible = false;
  group.add(art);
  if (hung.rods) {
    /* Bamboo, in the town's own bamboo green. */
    const rods = new THREE.Mesh(
      hung.rods,
      celMaterial({ color: 0x94b06b, rim: 0.18, rimColor: RIM, spec: 0.12 }),
    );
    rods.name = 'wallArtRods';
    group.add(rods);
  }
  let artLoad = null;
  /* Resolves true when the art is up and false when the room goes on
   * without it: a picture that failed, or one six seconds late. The room is
   * then simply bare, which is what the simulator does too. */
  function loadArt() {
    if (!artLoad) {
      artLoad = new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        const timer = setTimeout(() => resolve(false), 6000);
        img.onload = () => {
          artTex.image = img;
          artTex.needsUpdate = true;
          art.visible = true;
          clearTimeout(timer);
          resolve(true);
        };
        img.onerror = () => {
          console.warn(`room: ${WALLART.url} did not load; the walls are bare`);
          clearTimeout(timer);
          resolve(false);
        };
        img.src = new URL(`../${WALLART.url}?v=${WALLART.rev}`, import.meta.url).href;
      });
    }
    return artLoad;
  }

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
   * flies here on their own. A room with nothing in it but a track is a
   * render of a track; a room with a charger on a bench and one chair pulled
   * out is a place a person goes. Well clear of the track, which reaches
   * 1.63 m from the middle of the room in x and 1.18 in z, and below the
   * rail, so no poster is behind it.
   *
   * THE ONLY FURNITURE NOW. The shed had a roller shutter, shelving, crates,
   * a ladder, a pegboard, a clock, a hose, totes, two flat banners and a
   * door, all there to give each of four bare walls something different at
   * the end of every heading. The simulator's room answers that with its
   * art, a different set of prints on every wall, and has none of the rest;
   * the shutter stood where a poster hangs now and the door where another
   * does. Kept, they would have been a room the simulator does not have.
   */
  const kit = new THREE.Group();
  /* In the far corner beyond the track rather than beside the camera. The
   * act's opening shot comes in over the near left corner, and a trestle
   * table a metre from the lens is a rectangle across a third of the
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
  const packMat = celMaterial({ color: 0x3c4450, rim: 0.24, rimColor: RIM });
  for (let i = 0; i < 5; i += 1) {
    const cell = new THREE.Mesh(packsGeo, packMat);
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

  /* ---------------------------------------------------------------- controls */

  /*
   * THE LIGHT SWITCH, as a number between nothing and one.
   *
   * The act arrives out of black and this is what brings it up: not a fade
   * from a veil over the top of a lit room, but the room's own lights coming
   * on, so the light lands where light lands. The four lamps, the bounce,
   * the panels and the painted ceiling all move together, and so does the
   * air, through airAt, and everything is a plain multiply or a plain mix,
   * which means the frame is a pure function of the parameter and the whole
   * thing scrubs backwards as cleanly as it plays forwards.
   *
   * THE SIMULATOR'S FIGURES, and they are chosen from pictures there: ten a
   * lamp, the bounce at 0.6 and the key at 0.45 (ROOM_INDOOR above) put the
   * plaster at about 200 of luma, the gate band at about 88 and a pipe's
   * core 45 to 75 above the band. This page has none of the simulator's post
   * chain, so they were read back here the same way, off the act's
   * establishing frame at 1280 by 720: plaster 199 to 221, a pipe's core 143
   * to 165, and the band about 50, darker than there because nothing here
   * lifts the darks as the simulator's grade does. So a gate stands 90 to
   * 110 above the band on this page, which is more margin rather than less,
   * and the colours stay the simulator's number for number. The shed they
   * replace had two warm bulbs at 26 on a softer decay, turned up because a
   * bulb on a flex a foot from the boards burnt the ceiling white wherever
   * it was in frame, and this act looks up. The ceiling is painted now, not
   * lit, and the lamps are hidden behind the panels, so that trade is gone.
   *
   * A panel goes down to a sixth rather than to black, because an unlit
   * diffuser is still a pale shape in a dark room, and the ceiling to a
   * twenty fifth, because a room with its lights off has a ceiling nobody
   * can see.
   */
  const LAMP = 10;
  const BOUNCE = 0.6;
  const panelBase = new THREE.Color(PAL.lamp);
  const ceilBase = new THREE.Color(PAL.ceiling);
  function setLamps(k) {
    const on = Math.max(0, Math.min(1, k));
    for (const p of points) {
      p.intensity = LAMP * on;
    }
    bounce.intensity = BOUNCE * on;
    panelMat.color.copy(panelBase).multiplyScalar(0.16 + 0.84 * on);
    ceilMat.color.copy(ceilBase).multiplyScalar(0.04 + 0.96 * on);
  }
  setLamps(0);

  /*
   * THE AIR AT A LAMP LEVEL: the blackout's own dark with the lights off,
   * the simulator's pale room air with them on. The stage paints the fog,
   * the background and the clear colour with it, so a far wall goes to
   * dark in a dark room and to pale air in a lit one rather than glowing
   * pale before the lights are on. One colour, reused: read it now or copy.
   */
  const darkAir = new THREE.Color(PAL.dark);
  const litAir = new THREE.Color(PAL.air);
  const airNow = new THREE.Color();
  function airAt(k) {
    return airNow.copy(darkAir).lerp(litAir, Math.max(0, Math.min(1, k)));
  }

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
    airAt,
    loadArt,
    setShown,
  };
}
