/*
 * model.js: the plant constants, small enough to run in a figure.
 *
 * A figure that draws a curve from memory is an illustration. A figure that
 * solves the same equation the simulator solves is an argument. These are
 * the Stage 1 airframe's real numbers, snapshotted from the comment block at
 * the top of src/native/plant.c the same way src/fc snapshots the catalog.
 * If these and the simulator disagree, the simulator wins and this file is
 * stale.
 *
 * Nothing here is a physics engine. There is no integrator, no quaternion
 * and no collision. It is the handful of closed forms a diagram needs to be
 * honest: the motor's steady state, the pack's sag, the advance-ratio and
 * vortex-ring gap, Glauert inflow, the H-force, Betaflight's rate curves and
 * its PID scale factors.
 *
 * This file is part of the WebFPVSimulator landing page.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

export const P = {
  mass: 0.65,
  g: 9.80665,
  inertia: { roll: 0.0035, pitch: 0.0038, yaw: 0.0068 },
  arm: 0.110 / Math.SQRT2,
  discZ: 0.020,
  kt: 1.98e-6,
  kq: 2.80e-8,
  ke: 0.006336,
  rMotor: 0.1825,
  jRotor: 8.0e-6,
  cells: 6,
  rCell: 0.0025,
  rho: 1.225,
  propR: 0.0635,
  propPitch: 4.3 * 0.0254,
  fm: 0.565,
  cdaPlan: 0.0225,
  cdaFront: 0.0130,
  cdaSide: 0.0147,
  vrsOnset: -0.30,
  vrsFull: -1.20,
  vrsFloor: 0.75,
  kPropwash: 0.08,
  hK: 0.43842,
  cantDeg: { RR: -0.9, FR: 1.4, RL: 0.6, FL: -1.2 },
};

P.discA = Math.PI * P.propR * P.propR;
P.rPack = P.cells * P.rCell;
P.weight = P.mass * P.g;
/* Pitch speed is what one revolution screws through in still air. */
P.pitchSpeed = (w) => (w / (2 * Math.PI)) * P.propPitch;

export function packOpenCircuit(cellV = 4.2) {
  return P.cells * cellV;
}

/*
 * Steady state of one motor at a duty.
 *
 * Torque balance is ke I = kq w^2 with I = (d Vpack - ke w) / R, so
 *   (kq R / ke) w^2 + ke w - d Vpack = 0,
 * one positive root. The rotor's own inertia does not appear because this
 * is the state the rotor is heading towards, not the path it takes.
 */
export function motorSteady(duty, vpack) {
  const d = Math.max(0, Math.min(1, duty));
  const a = (P.kq * P.rMotor) / P.ke;
  const b = P.ke;
  const c = -d * vpack;
  if (d <= 0) {
    return { w: 0, amps: 0, thrust: 0, torque: 0 };
  }
  const w = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  const amps = (d * vpack - P.ke * w) / P.rMotor;
  return { w, amps, thrust: P.kt * w * w, torque: P.kq * w * w };
}

/*
 * The pack is a voltage behind a resistor, and the current it is asked for
 * depends on the voltage it delivers. Ten fixed-point passes settle it; the
 * plant does the same thing implicitly each step.
 */
export function packUnderLoad(duty, cellV = 4.2, motors = 4) {
  const voc = packOpenCircuit(cellV);
  let v = voc;
  let m = motorSteady(duty, v);
  for (let i = 0; i < 10; i += 1) {
    v = voc - motors * m.amps * P.rPack;
    if (v < 0) {
      v = 0;
    }
    m = motorSteady(duty, v);
  }
  return { v, voc, sag: voc - v, packAmps: motors * m.amps, ...m };
}

/* The rotor's linearised time constant at a running speed. */
export function rotorTau(w) {
  const slope = (P.ke * P.ke) / P.rMotor + 2 * P.kq * Math.abs(w);
  return P.jRotor / slope;
}

export function hoverDuty(cellV = 4.2) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const s = packUnderLoad(mid, cellV);
    if (s.thrust * 4 < P.weight) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/*
 * The advance-ratio and vortex-ring gap, PLANT_VRS_* in plant.c.
 *
 * mu is axial airspeed over pitch speed. Positive mu is a climb and costs
 * thrust because the screw is chasing air that is already leaving. Negative
 * mu is a descent and pays thrust back, until the momentum-theory solution
 * runs out at the onset and the curve is bridged down to a floor.
 */
export function axialFactor(mu) {
  if (mu >= 0) {
    return Math.max(0, 1 - mu);
  }
  if (mu > P.vrsOnset) {
    return 1 - mu;
  }
  const top = 1 - P.vrsOnset;
  if (mu <= P.vrsFull) {
    return P.vrsFloor;
  }
  const s = (mu - P.vrsOnset) / (P.vrsFull - P.vrsOnset);
  return top + s * (P.vrsFloor - top);
}

/* Glauert inflow in edgewise flow, normalised to the hover induced speed. */
export function glauert(x) {
  const x2 = x * x;
  return Math.sqrt(2 / (Math.sqrt(x2 * x2 + 4) + x2));
}

export function hoverInduced(thrust) {
  return Math.sqrt(Math.max(0, thrust) / (2 * P.rho * P.discA));
}

/* One rotor's rearward H-force in edgewise flow. */
export function hForce(vPerp, thrust) {
  const vh = hoverInduced(thrust);
  const vi = vh * glauert(vPerp / Math.max(vh, 1e-6));
  return P.hK * P.rho * P.discA * vi * vPerp;
}

export function bodyDrag(v, cda) {
  return 0.5 * P.rho * cda * v * v;
}

/*
 * Betaflight 4.5.1 ACTUAL rates, from applyActualRates in fc/rc.c.
 * rcRate and srate are stored in tens of degrees per second.
 */
export function actualRate(stick, rcRate = 7, srate = 67, expo = 0) {
  const s = Math.max(-1, Math.min(1, stick));
  const a = Math.abs(s);
  const centre = rcRate * 10;
  const movement = Math.max(0, srate * 10 - centre);
  const e = Math.max(0, Math.min(1, expo / 100));
  const expof = a * (a ** 5 * e + a * (1 - e));
  return Math.sign(s) * (a * centre + movement * expof);
}

/* pid.c's fixed scale factors. Sliders can therefore carry real CLI numbers. */
export const PTERM_SCALE = 0.032029;
export const ITERM_SCALE = 0.244381;
export const DTERM_SCALE = 0.000529;

/*
 * Aerodynamic roll damping, derived rather than chosen.
 *
 * Roll at p and the rotors at +y climb at p*arm while the rotors at -y
 * sink at the same speed. Through axial(mu) that is a thrust difference,
 * and a thrust difference across the arm is a torque opposing the roll:
 *   M = -4 arm T (p arm / Vpitch),
 * so the coefficient is 4 arm^2 T / Vpitch. This is the term the old
 * descent clamp deleted, and deleting it is why centring the stick used
 * to feel like a rubber band.
 */
export function rollDamping(w) {
  const thrust = P.kt * w * w;
  return (4 * P.arm * P.arm * thrust) / Math.max(P.pitchSpeed(w), 1e-6);
}

/* PT1, the shape of every lpf1 in the chain. */
export function pt1Gain(hz, dt) {
  const rc = 1 / (2 * Math.PI * Math.max(hz, 1));
  return dt / (rc + dt);
}

/*
 * One axis of the rate loop, stepped at 1 kHz the way the real one is.
 *
 * The plant side is the real inertia, the real rotor lag and the real
 * thrust slope at a hover. The controller side is Betaflight's own scale
 * factors on the gains a pilot actually types. It is one axis, linearised
 * about a hover, with no mixer clipping: enough to be right about the shape
 * of a step, not enough to be a simulator.
 */
export function rateLoop(opts = {}) {
  const {
    p = 45, i = 80, d = 30, f = 120,
    gyroHz = 250, dtermHz = 100, noise = 0,
    relax = true, hoverW = null,
  } = opts;
  const dt = 0.001;
  const w0 = hoverW == null ? motorSteady(hoverDuty(), packOpenCircuit()).w : hoverW;
  /* Roll torque per unit differential duty, linearised at w0. */
  const dwdd = packOpenCircuit() / (P.ke + 2 * ((P.kq * P.rMotor) / P.ke) * w0);
  const dtdd = 2 * P.kt * w0 * dwdd;
  const torquePerDuty = 4 * P.arm * dtdd;
  const tau = rotorTau(w0);
  const damp = rollDamping(w0);
  const kp = PTERM_SCALE * p;
  const ki = ITERM_SCALE * i;
  const kd = DTERM_SCALE * d;
  const kf = 0.013754 * f;
  const aGyro = pt1Gain(gyroHz, dt);
  const aD = pt1Gain(dtermHz, dt);
  let rate = 0;
  let duty = 0;
  let iTerm = 0;
  let gyroF = 0;
  let dF = 0;
  let prevGyro = 0;
  let prevSet = 0;
  let setLp = 0;
  let seed = 22222;
  const rand = () => {
    seed ^= seed << 13; seed >>>= 0;
    seed ^= seed >> 17;
    seed ^= seed << 5; seed >>>= 0;
    return seed / 4294967296 - 0.5;
  };
  return {
    dt,
    tau,
    /* setpoint in deg/s. Returns the state after one 1 ms tick. */
    step(setpoint) {
      const deg = rate * (180 / Math.PI);
      const dirty = deg + noise * rand() * 60;
      gyroF += (dirty - gyroF) * aGyro;
      const err = setpoint - gyroF;
      /*
       * iterm_relax, from pid.c: high-pass the setpoint and stop winding I
       * while the stick is moving, because a stick move is not a
       * disturbance. Without it a rate step overshoots on stored I, which
       * is the classic "my quad bounces out of a flip" complaint.
       */
      setLp += (setpoint - setLp) * pt1Gain(15, dt);
      const hpf = Math.abs(setpoint - setLp);
      const relaxFactor = relax ? Math.max(0, 1 - hpf / 40) : 1;
      iTerm += ki * err * dt * relaxFactor;
      iTerm = Math.max(-300, Math.min(300, iTerm));
      const raw = -(gyroF - prevGyro) / dt;
      dF += (raw - dF) * aD;
      prevGyro = gyroF;
      const ff = kf * (setpoint - prevSet);
      prevSet = setpoint;
      const sum = kp * err + iTerm + kd * dF + ff;
      const demand = Math.max(-1, Math.min(1, sum / 1000));
      duty += (demand - duty) * (dt / tau);
      const torque = torquePerDuty * duty;
      rate += ((torque - damp * rate) / P.inertia.roll) * dt;
      return { rate: deg, gyro: gyroF, err, sum, duty, iTerm };
    },
  };
}
